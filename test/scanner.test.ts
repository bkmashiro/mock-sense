import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectTestFiles } from "../src/scanner.js";

test("collectTestFiles returns a direct file path unchanged", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-scanner-"));
  const filePath = path.join(tempDir, "single.test.ts");

  try {
    await writeFile(filePath, "expect(true).toBe(true);\n");
    const files = await collectTestFiles(filePath, [".test.ts"]);
    assert.deepEqual(files, [filePath]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("collectTestFiles normalizes extensions, filters blanks, and sorts results", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mock-sense-scanner-"));
  const nestedDir = path.join(tempDir, "nested");
  const firstFile = path.join(tempDir, "b.spec.ts");
  const secondFile = path.join(nestedDir, "a.test.js");
  const ignoredFile = path.join(tempDir, "ignore.txt");

  try {
    await mkdir(nestedDir);
    await writeFile(firstFile, "assert.ok(true);\n");
    await writeFile(secondFile, "assert.ok(true);\n");
    await writeFile(ignoredFile, "noop\n");

    const files = await collectTestFiles(tempDir, [" spec.ts ", "", "test.js"]);
    assert.deepEqual(files, [firstFile, secondFile]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
