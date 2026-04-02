import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { formatReport, type ReportData } from "../src/formatter.js";

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
