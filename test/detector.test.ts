import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { analyzeFile, analyzeSource } from "../src/detector.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures");

test("healthy file stays below threshold with no vacuous assertions", async () => {
  const filePath = path.join(fixturesDir, "healthy.fixture.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.equal(result.suspicious, false);
  assert.equal(result.mocks, 0);
  assert.equal(result.assertions, 8);
  assert.equal(result.ratio < 3.0, true);
  assert.deepEqual(result.vacuousAssertions, []);
});

test("over-mocked file is flagged when ratio exceeds threshold", async () => {
  const filePath = path.join(fixturesDir, "over-mocked.fixture.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.equal(result.suspicious, true);
  assert.equal(result.mocks, 15);
  assert.equal(result.assertions, 2);
  assert.equal(result.ratio > 3.0, true);
});

test("vacuous assertions are detected with correct line numbers", async () => {
  const filePath = path.join(fixturesDir, "vacuous.fixture.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.deepEqual(result.vacuousAssertions, [
    { line: 5, text: "assert.equal(true, true);" },
    { line: 6, text: "assert.ok(undefined !== undefined);" }
  ]);
});

test("empty source reports no issues", () => {
  const result = analyzeSource("empty.test.ts", "", 3.0);

  assert.equal(result.suspicious, false);
  assert.equal(result.mocks, 0);
  assert.equal(result.assertions, 0);
  assert.equal(result.ratio, 0);
  assert.deepEqual(result.vacuousAssertions, []);
});

test("mock-only source reports infinite ratio and is suspicious", () => {
  const result = analyzeSource("mock-only.test.ts", "jest.mock('./dep');", 3.0);

  assert.equal(result.mocks, 1);
  assert.equal(result.assertions, 0);
  assert.equal(result.ratio, Number.POSITIVE_INFINITY);
  assert.equal(result.suspicious, true);
});

test("same literal vacuous assertions are detected", () => {
  const result = analyzeSource(
    "same-literal.test.ts",
    [
      "assert.strictEqual('x', 'x');",
      "assert.strictEqual(-2, -2);",
      "expect(value).toBe(true);"
    ].join("\n"),
    10
  );

  assert.deepEqual(result.vacuousAssertions, [
    { line: 1, text: "assert.strictEqual('x', 'x');" },
    { line: 2, text: "assert.strictEqual(-2, -2);" }
  ]);
  assert.equal(result.assertions, 3);
});
