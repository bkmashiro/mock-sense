import { readFile } from "node:fs/promises";
import {
  analyzeCoverageSource,
  type CoverageFileAnalysis,
  type MockCoverageItem
} from "./coverage-checker.js";

export interface Suggestion {
  filePath: string;
  line: number;
  mockName: string;
  reason: string;
  suggestion: string;
}

function formatArgumentForAssertion(argument: string): string {
  const trimmed = argument.trim();
  if (trimmed.length === 0) {
    return "expect.anything()";
  }

  if (
    /^["'`].*["'`]$/.test(trimmed) ||
    /^(?:true|false|null|undefined|-?\d+(?:\.\d+)?)$/.test(trimmed)
  ) {
    return trimmed;
  }

  return trimmed;
}

function createCalledWithSuggestion(mock: MockCoverageItem, filePath: string): Suggestion | null {
  const firstCall = mock.callSamples[0];
  if (firstCall === undefined) {
    return null;
  }

  const argText = firstCall.args.length > 0 ? firstCall.args.join(", ") : "no arguments";
  const expectedArgs =
    firstCall.args.length > 0
      ? firstCall.args.map(formatArgumentForAssertion).join(", ")
      : "";

  return {
    filePath,
    line: firstCall.line,
    mockName: mock.name,
    reason: `${mock.name} is called with (${argText})`,
    suggestion:
      expectedArgs.length > 0
        ? `expect(${mock.name}).toHaveBeenCalledWith(${expectedArgs})`
        : `expect(${mock.name}).toHaveBeenCalled()`
  };
}

function createReturnSuggestion(mock: MockCoverageItem, filePath: string): Suggestion | null {
  const assignment = mock.assignedResults[0];
  if (assignment === undefined) {
    return null;
  }

  return {
    filePath,
    line: assignment.line,
    mockName: mock.name,
    reason: `${mock.name} return value assigned to ${assignment.variableName} but never asserted`,
    suggestion: `expect(${assignment.variableName}).toBeDefined()`
  };
}

export function buildSuggestions(analysis: CoverageFileAnalysis): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const mock of analysis.mocks) {
    if (mock.callCount === 0 || mock.assertedOn) {
      continue;
    }

    const returnSuggestion = createReturnSuggestion(mock, analysis.filePath);
    if (returnSuggestion !== null) {
      suggestions.push(returnSuggestion);
      continue;
    }

    const callSuggestion = createCalledWithSuggestion(mock, analysis.filePath);
    if (callSuggestion !== null) {
      suggestions.push(callSuggestion);
    }
  }

  return suggestions;
}

export function suggestFromSource(filePath: string, source: string): Suggestion[] {
  return buildSuggestions(analyzeCoverageSource(filePath, source));
}

export async function suggestForFile(filePath: string): Promise<Suggestion[]> {
  const source = await readFile(filePath, "utf8");
  return suggestFromSource(filePath, source);
}
