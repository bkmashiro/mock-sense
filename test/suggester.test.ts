import assert from "node:assert/strict";
import test from "node:test";
import { suggestFromSource } from "../src/suggester.js";

test("suggester recommends call assertions for unchecked mocks", () => {
  const suggestions = suggestFromSource(
    "api.test.ts",
    ['const sendEmail = jest.fn();', 'sendEmail(to, "Welcome", body);'].join("\n")
  );

  assert.deepEqual(suggestions, [
    {
      filePath: "api.test.ts",
      line: 2,
      mockName: "sendEmail",
      reason: 'sendEmail is called with (to, "Welcome", body)',
      suggestion: 'expect(sendEmail).toHaveBeenCalledWith(to, "Welcome", body)'
    }
  ]);
});

test("suggester prioritizes unchecked return values", () => {
  const suggestions = suggestFromSource(
    "auth.test.ts",
    ["const validateToken = vi.fn();", "const result = validateToken(token);"].join("\n")
  );

  assert.deepEqual(suggestions, [
    {
      filePath: "auth.test.ts",
      line: 2,
      mockName: "validateToken",
      reason: "validateToken return value assigned to result but never asserted",
      suggestion: "expect(result).toBeDefined()"
    }
  ]);
});
