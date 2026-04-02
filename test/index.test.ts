import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCoverageReportData,
  buildReportData,
  buildSuggestionReportData,
  runCli
} from "../src/index.js";

test("buildReportData aggregates issue counts", () => {
  const report = buildReportData(
    "test",
    [
      {
        filePath: "a.test.ts",
        mocks: 3,
        assertions: 1,
        ratio: 3,
        suspicious: true,
        vacuousAssertions: []
      },
      {
        filePath: "b.test.ts",
        mocks: 0,
        assertions: 1,
        ratio: 0,
        suspicious: false,
        vacuousAssertions: [{ line: 2, text: "assert.ok(true);" }]
      }
    ],
    2
  );

  assert.equal(report.analyzedFileCount, 2);
  assert.equal(report.suspiciousFiles, 1);
  assert.equal(report.vacuousAssertions, 1);
  assert.equal(report.issuesFound, true);
});

test("buildCoverageReportData aggregates dead and unchecked mocks", () => {
  const report = buildCoverageReportData("test", [
    {
      filePath: "api.test.ts",
      deadMocks: 1,
      uncheckedMocks: 0,
      mocks: []
    },
    {
      filePath: "auth.test.ts",
      deadMocks: 0,
      uncheckedMocks: 2,
      mocks: []
    }
  ]);

  assert.equal(report.deadMocks, 1);
  assert.equal(report.uncheckedMocks, 2);
  assert.equal(report.issuesFound, true);
});

test("buildSuggestionReportData tracks suggestion count as issues", () => {
  const report = buildSuggestionReportData("test", 2, [
    {
      filePath: "api.test.ts",
      line: 5,
      mockName: "sendEmail",
      reason: "sendEmail is called with (to)",
      suggestion: "expect(sendEmail).toHaveBeenCalledWith(to)"
    }
  ]);

  assert.equal(report.analyzedFileCount, 2);
  assert.equal(report.suggestions.length, 1);
  assert.equal(report.issuesFound, true);
});

test("runCli rejects invalid thresholds with exit code 2", async () => {
  const errors: string[] = [];
  const originalError = console.error;
  const originalExitCode = process.exitCode;

  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  process.exitCode = undefined;

  try {
    await runCli(["node", "mock-sense", "test", "--threshold", "-1"]);
    assert.deepEqual(errors, ["Invalid threshold. Expected a non-negative number."]);
    assert.equal(process.exitCode, 2);
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});

test("runCli emits json and honors --no-fail when issues are found", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-cli-"));
  const filePath = path.join(tempDir, "sample.test.ts");
  const logs: string[] = [];
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  try {
    await writeFile(
      filePath,
      ["jest.mock('./dep');", "assert.equal(true, true);"].join("\n")
    );

    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
    process.exitCode = undefined;

    await runCli([
      "node",
      "mock-sense",
      tempDir,
      "--json",
      "--no-fail",
      "--threshold",
      "0.5"
    ]);

    assert.equal(process.exitCode, undefined);
    assert.equal(logs.length, 1);

    const report = JSON.parse(logs[0]) as {
      analyzedFileCount: number;
      suspiciousFiles: number;
      vacuousAssertions: number;
      issuesFound: boolean;
    };

    assert.equal(report.analyzedFileCount, 1);
    assert.equal(report.suspiciousFiles, 1);
    assert.equal(report.vacuousAssertions, 1);
    assert.equal(report.issuesFound, true);
  } finally {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runCli emits coverage output", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-cli-"));
  const filePath = path.join(tempDir, "sample.test.ts");
  const logs: string[] = [];
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  try {
    await writeFile(
      filePath,
      [
        "const fetchUser = jest.fn();",
        "const sendEmail = jest.fn();",
        "fetchUser(1);",
        "expect(fetchUser).toHaveBeenCalledWith(1);"
      ].join("\n")
    );

    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
    process.exitCode = undefined;

    await runCli(["node", "mock-sense", tempDir, "--coverage", "--no-fail"]);

    assert.equal(process.exitCode, undefined);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /Mock Usage Coverage:/);
    assert.match(logs[0], /✅ fetchUser/);
    assert.match(logs[0], /❌ sendEmail/);
  } finally {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runCli emits suggestions", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-cli-"));
  const filePath = path.join(tempDir, "sample.test.ts");
  const logs: string[] = [];
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  try {
    await writeFile(
      filePath,
      ['const sendEmail = jest.fn();', 'sendEmail(to, "Welcome", body);'].join("\n")
    );

    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
    process.exitCode = undefined;

    await runCli(["node", "mock-sense", tempDir, "--suggest", "--no-fail"]);

    assert.equal(process.exitCode, undefined);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /Suggested improvements:/);
    assert.match(logs[0], /sendEmail is called with \(to, "Welcome", body\)/);
  } finally {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runCli rejects combining coverage and suggest modes", async () => {
  const errors: string[] = [];
  const originalError = console.error;
  const originalExitCode = process.exitCode;

  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  process.exitCode = undefined;

  try {
    await runCli(["node", "mock-sense", "test", "--coverage", "--suggest"]);
    assert.deepEqual(errors, ["Choose either --coverage or --suggest, not both."]);
    assert.equal(process.exitCode, 2);
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});

test("runCli surfaces thrown errors as exit code 1", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-cli-"));
  const logs: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExitCode = process.exitCode;

  try {
    await mkdir(path.join(tempDir, "empty"));

    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
    console.error = (message?: unknown) => {
      errors.push(String(message));
    };
    process.exitCode = undefined;

    await runCli(["node", "mock-sense", path.join(tempDir, "missing")]).catch(
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exitCode = 1;
      }
    );

    assert.deepEqual(logs, []);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /ENOENT/);
    assert.equal(process.exitCode, 1);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = originalExitCode;
    await rm(tempDir, { recursive: true, force: true });
  }
});
