import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCoverageSource } from "../src/coverage-checker.js";

test("coverage checker reports called, dead, and unchecked mocks", () => {
  const result = analyzeCoverageSource(
    "api.test.ts",
    [
      "const fetchUser = jest.fn();",
      "const sendEmail = vi.fn();",
      "const validateToken = jest.fn();",
      "",
      "fetchUser(1);",
      "fetchUser(2);",
      "fetchUser(3);",
      "const result = validateToken(token);",
      'expect(fetchUser).toHaveBeenCalledWith(1);'
    ].join("\n")
  );

  assert.equal(result.deadMocks, 1);
  assert.equal(result.uncheckedMocks, 1);
  assert.deepEqual(
    result.mocks.map((mock) => ({
      name: mock.name,
      callCount: mock.callCount,
      assertedOn: mock.assertedOn
    })),
    [
      { name: "fetchUser", callCount: 3, assertedOn: true },
      { name: "sendEmail", callCount: 0, assertedOn: false },
      { name: "validateToken", callCount: 1, assertedOn: false }
    ]
  );
});

test("coverage checker marks direct return assertions as asserted", () => {
  const result = analyzeCoverageSource(
    "auth.test.ts",
    [
      "const hashPassword = jest.fn();",
      "expect(hashPassword(password)).toBe('hashed');"
    ].join("\n")
  );

  assert.equal(result.deadMocks, 0);
  assert.equal(result.uncheckedMocks, 0);
  assert.equal(result.mocks[0]?.hasReturnAssertion, true);
  assert.equal(result.mocks[0]?.assertedOn, true);
});
