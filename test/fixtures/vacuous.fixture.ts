import assert from "node:assert/strict";

describe("vacuous assertions", () => {
  it("contains always passing assertions", () => {
    assert.equal(true, true);
    assert.ok(undefined !== undefined);
  });
});
