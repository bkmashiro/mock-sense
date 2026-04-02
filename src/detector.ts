import { readFile } from "node:fs/promises";

export interface VacuousAssertion {
  line: number;
  text: string;
}

export interface FileAnalysis {
  filePath: string;
  mocks: number;
  assertions: number;
  ratio: number;
  suspicious: boolean;
  vacuousAssertions: VacuousAssertion[];
}

const mockPatterns = [
  /jest\.mock\s*\(/,
  /vi\.mock\s*\(/,
  /sinon\.stub\s*\(/,
  /jest\.fn\s*\(/,
  /vi\.fn\s*\(/,
  /\bmock\./,
  /\.mockReturnValue\s*\(/,
  /\.mockResolvedValue\s*\(/
];

const assertionPatterns = [
  /\bexpect\s*\(/,
  /\bassert\./,
  /\bshould\./
];

const sameLiteralPattern =
  /assert\.strictEqual\s*\(\s*(true|false|null|undefined|-?\d+(?:\.\d+)?|(["'`])(?:\\.|(?!\2).)*\2)\s*,\s*\1\s*\)/;

const vacuousPatterns = [
  /assert\.equal\s*\(\s*true\s*,\s*true\s*\)/,
  /assert\.ok\s*\(\s*true\s*\)/,
  /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/,
  /assert\.ok\s*\(\s*undefined\s*!==\s*undefined\s*\)/,
  sameLiteralPattern
];

export function analyzeSource(
  filePath: string,
  source: string,
  threshold: number
): FileAnalysis {
  const lines = source.split(/\r?\n/);
  let mocks = 0;
  let assertions = 0;
  const vacuousAssertions: VacuousAssertion[] = [];

  for (const [index, line] of lines.entries()) {
    if (mockPatterns.some((pattern) => pattern.test(line))) {
      mocks += 1;
    }

    if (assertionPatterns.some((pattern) => pattern.test(line))) {
      assertions += 1;
    }

    if (vacuousPatterns.some((pattern) => pattern.test(line))) {
      vacuousAssertions.push({
        line: index + 1,
        text: line.trim()
      });
    }
  }

  const ratio = assertions === 0 ? (mocks > 0 ? Number.POSITIVE_INFINITY : 0) : mocks / assertions;

  return {
    filePath,
    mocks,
    assertions,
    ratio,
    suspicious: ratio > threshold,
    vacuousAssertions
  };
}

export async function analyzeFile(filePath: string, threshold: number): Promise<FileAnalysis> {
  const source = await readFile(filePath, "utf8");
  return analyzeSource(filePath, source, threshold);
}
