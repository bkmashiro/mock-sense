import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { analyzeFile, analyzeSource } from "../src/detector.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures");

test("healthy file stays below threshold with no vacuous assertions", async () => {
  const filePath = path.join(fixturesDir, "healthy.test.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.equal(result.suspicious, false);
  assert.equal(result.mocks, 2);
  assert.equal(result.assertions, 8);
  assert.equal(result.ratio < 3.0, true);
  assert.deepEqual(result.vacuousAssertions, []);
});

test("over-mocked file is flagged when ratio exceeds threshold", async () => {
  const filePath = path.join(fixturesDir, "over-mocked.test.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.equal(result.suspicious, true);
  assert.equal(result.mocks, 15);
  assert.equal(result.assertions, 2);
  assert.equal(result.ratio > 3.0, true);
});

test("vacuous assertions are detected with correct line numbers", async () => {
  const filePath = path.join(fixturesDir, "vacuous.test.ts");
  const result = await analyzeFile(filePath, 3.0);

  assert.deepEqual(result.vacuousAssertions, [
    { line: 4, text: "assert.equal(true, true);" },
    { line: 5, text: "assert.ok(undefined !== undefined);" }
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
