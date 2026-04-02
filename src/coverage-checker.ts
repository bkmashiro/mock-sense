import { readFile } from "node:fs/promises";

export interface MockAssignment {
  variableName: string;
  line: number;
}

export interface MockCallSample {
  line: number;
  args: string[];
}

export interface MockCoverageItem {
  name: string;
  line: number;
  callCount: number;
  assertedOn: boolean;
  hasCallAssertion: boolean;
  hasReturnAssertion: boolean;
  assignedResults: MockAssignment[];
  callSamples: MockCallSample[];
}

export interface CoverageFileAnalysis {
  filePath: string;
  mocks: MockCoverageItem[];
  deadMocks: number;
  uncheckedMocks: number;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitArguments(argsSource: string): string[] {
  return argsSource
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isAssertionLine(line: string): boolean {
  return /\bexpect\s*\(|\bassert\.|\bshould\./.test(line);
}

function getOrCreateMock(
  mocks: Map<string, MockCoverageItem>,
  name: string,
  line: number
): MockCoverageItem {
  const existing = mocks.get(name);
  if (existing !== undefined) {
    return existing;
  }

  const created: MockCoverageItem = {
    name,
    line,
    callCount: 0,
    assertedOn: false,
    hasCallAssertion: false,
    hasReturnAssertion: false,
    assignedResults: [],
    callSamples: []
  };
  mocks.set(name, created);
  return created;
}

export function analyzeCoverageSource(
  filePath: string,
  source: string
): CoverageFileAnalysis {
  const lines = source.split(/\r?\n/);
  const mocks = new Map<string, MockCoverageItem>();

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const definitionMatch =
      line.match(
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:jest|vi)\.fn\s*\(/
      ) ??
      line.match(
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?sinon\.stub\s*\(/
      ) ??
      line.match(
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?jest\.spyOn\s*\(/
      );

    if (definitionMatch !== null) {
      getOrCreateMock(mocks, definitionMatch[1], lineNumber);
    }

    const configuredMockMatch = line.match(
      /\b([A-Za-z_$][\w$]*)\.mock(?:ReturnValue|ResolvedValue|RejectedValue|Implementation|ReturnValueOnce|ResolvedValueOnce|RejectedValueOnce|ImplementationOnce)\s*\(/
    );

    if (configuredMockMatch !== null) {
      getOrCreateMock(mocks, configuredMockMatch[1], lineNumber);
    }
  }

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    for (const mock of mocks.values()) {
      const namePattern = escapeRegex(mock.name);
      const assignmentPattern = new RegExp(
        `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${namePattern}\\s*\\(([^)]*)\\)`,
        "g"
      );

      let assignmentMatch = assignmentPattern.exec(line);
      while (assignmentMatch !== null) {
        mock.callCount += 1;
        mock.callSamples.push({
          line: lineNumber,
          args: splitArguments(assignmentMatch[2] ?? "")
        });
        mock.assignedResults.push({
          variableName: assignmentMatch[1],
          line: lineNumber
        });
        assignmentMatch = assignmentPattern.exec(line);
      }

      const callPattern = new RegExp(`(^|[^\\w$.])${namePattern}\\s*\\(([^)]*)\\)`, "g");
      let callMatch = callPattern.exec(line);
      while (callMatch !== null) {
        const prefix = callMatch[1] ?? "";
        const callStart = callMatch.index + prefix.length;
        const isAssignmentCall =
          /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*$/.test(line.slice(0, callStart));

        if (!isAssignmentCall) {
          mock.callCount += 1;
          mock.callSamples.push({
            line: lineNumber,
            args: splitArguments(callMatch[2] ?? "")
          });
        }

        if (isAssertionLine(line)) {
          mock.hasReturnAssertion = true;
          mock.assertedOn = true;
        }

        callMatch = callPattern.exec(line);
      }

      if (
        new RegExp(
          `\\bexpect\\s*\\(\\s*${namePattern}\\s*\\)(?:\\.not)?\\.(?:toHaveBeenCalled|toHaveBeenCalledTimes|toHaveBeenCalledWith|toHaveBeenNthCalledWith|toHaveBeenLastCalledWith|toHaveReturned|toHaveReturnedTimes|toHaveReturnedWith)\\b`
        ).test(line) ||
        new RegExp(`\\bexpect\\s*\\(\\s*${namePattern}\\.mock\\.calls\\s*\\)`).test(line)
      ) {
        mock.hasCallAssertion = true;
        mock.assertedOn = true;
      }

      if (
        mock.assignedResults.some((assignment) =>
          new RegExp(`\\b(?:expect\\s*\\(|assert\\.|should\\.)[^\\n]*\\b${escapeRegex(assignment.variableName)}\\b`).test(
            line
          )
        )
      ) {
        mock.hasReturnAssertion = true;
        mock.assertedOn = true;
      }
    }
  }

  const mockItems = Array.from(mocks.values()).sort((left, right) => left.line - right.line);
  const deadMocks = mockItems.filter((mock) => mock.callCount === 0).length;
  const uncheckedMocks = mockItems.filter(
    (mock) => mock.callCount > 0 && !mock.assertedOn
  ).length;

  return {
    filePath,
    mocks: mockItems,
    deadMocks,
    uncheckedMocks
  };
}

export async function analyzeCoverageFile(filePath: string): Promise<CoverageFileAnalysis> {
  const source = await readFile(filePath, "utf8");
  return analyzeCoverageSource(filePath, source);
}
