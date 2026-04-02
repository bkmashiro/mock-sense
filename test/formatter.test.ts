import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  formatCoverageReport,
  formatReport,
  formatSuggestionReport,
  type CoverageReportData,
  type ReportData,
  type SuggestionReportData
} from "../src/formatter.js";

function createReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    analyzedPath: "test",
    analyzedFileCount: 1,
    results: [],
    suspiciousFiles: 0,
    vacuousAssertions: 0,
    issuesFound: false,
    threshold: 3,
    ...overrides
  };
}

test("formatReport renders healthy output without extra blank lines", () => {
  const report = createReportData({
    results: [
      {
        filePath: path.join(process.cwd(), "test/healthy.fixture.ts"),
        mocks: 1,
        assertions: 2,
        ratio: 0.5,
        suspicious: false,
        vacuousAssertions: []
      }
    ]
  });

  const output = formatReport(report);
  assert.match(output, /Analyzing 1 test file\.\.\./);
  assert.match(output, /✓\s+test\/healthy\.fixture\.ts\s+\(healthy\)/);
  assert.match(output, /Summary: 0 suspicious files, 0 vacuous assertions found\./);
  assert.match(output, /Exit code: 0 \(healthy\)$/);
});

test("formatReport renders suspicious and vacuous details with infinity ratio", () => {
  const report = createReportData({
    analyzedFileCount: 2,
    suspiciousFiles: 1,
    vacuousAssertions: 1,
    issuesFound: true,
    threshold: 2.5,
    results: [
      {
        filePath: path.join(process.cwd(), "test/over-mocked.fixture.ts"),
        mocks: 3,
        assertions: 0,
        ratio: Number.POSITIVE_INFINITY,
        suspicious: true,
        vacuousAssertions: [{ line: 7, text: "assert.ok(true);" }]
      },
      {
        filePath: "",
        mocks: 0,
        assertions: 1,
        ratio: 0,
        suspicious: false,
        vacuousAssertions: []
      }
    ]
  });

  const output = formatReport(report);
  assert.match(output, /⚠\s+test\/over-mocked\.fixture\.ts/);
  assert.match(output, /Ratio: Infinity \(suspicious, threshold: 2\.5\)/);
  assert.match(output, /Line 7: assert\.ok\(true\);  ← vacuous assertion/);
  assert.match(output, /✓\s+\s+\(healthy\)/);
  assert.match(output, /Summary: 1 suspicious file, 1 vacuous assertion found\./);
  assert.match(output, /Exit code: 1 \(issues found\)$/);
});

test("formatCoverageReport renders dead and unchecked mocks", () => {
  const report: CoverageReportData = {
    analyzedPath: "test",
    analyzedFileCount: 1,
    deadMocks: 1,
    uncheckedMocks: 1,
    issuesFound: true,
    results: [
      {
        filePath: path.join(process.cwd(), "test/api.test.ts"),
        deadMocks: 1,
        uncheckedMocks: 1,
        mocks: [
          {
            name: "fetchUser",
            line: 1,
            callCount: 3,
            assertedOn: true,
            hasCallAssertion: true,
            hasReturnAssertion: false,
            assignedResults: [],
            callSamples: [{ line: 4, args: ["1"] }]
          },
          {
            name: "sendEmail",
            line: 2,
            callCount: 0,
            assertedOn: false,
            hasCallAssertion: false,
            hasReturnAssertion: false,
            assignedResults: [],
            callSamples: []
          },
          {
            name: "validateToken",
            line: 3,
            callCount: 1,
            assertedOn: false,
            hasCallAssertion: false,
            hasReturnAssertion: false,
            assignedResults: [{ variableName: "result", line: 5 }],
            callSamples: [{ line: 5, args: ["token"] }]
          }
        ]
      }
    ]
  };

  const output = formatCoverageReport(report);
  assert.match(output, /Mock Usage Coverage:/);
  assert.match(output, /✅ fetchUser \(mocked, called 3x\)/);
  assert.match(output, /❌ sendEmail \(mocked but NEVER called - dead mock\)/);
  assert.match(output, /⚠\s+validateToken \(mocked, called 1x but never asserted on\)/);
  assert.match(output, /Dead mocks: 1 \(remove them to simplify tests\)/);
  assert.match(output, /Unchecked mocks: 1 \(add assertions\)$/);
});

test("formatSuggestionReport renders suggestions", () => {
  const report: SuggestionReportData = {
    analyzedPath: "test",
    analyzedFileCount: 1,
    issuesFound: true,
    suggestions: [
      {
        filePath: path.join(process.cwd(), "test/api.test.ts"),
        line: 42,
        mockName: "sendEmail",
        reason: 'sendEmail is called with (to, "Welcome", body)',
        suggestion: 'expect(sendEmail).toHaveBeenCalledWith(to, "Welcome", body)'
      }
    ]
  };

  const output = formatSuggestionReport(report);
  assert.match(output, /Suggested improvements:/);
  assert.match(output, /test\/api\.test\.ts:42/);
  assert.match(output, /sendEmail is called with \(to, "Welcome", body\)/);
  assert.match(output, /→ Add: expect\(sendEmail\)\.toHaveBeenCalledWith\(to, "Welcome", body\)/);
});
