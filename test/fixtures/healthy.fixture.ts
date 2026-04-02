import assert from "node:assert/strict";

describe("healthy test", () => {
  it("checks observable behavior", () => {
    const dep = { method: () => 1 };
    const value = dep.method();

    assert.equal(value, 1);
    assert.equal(value + 1, 2);
    assert.equal(typeof value, "number");
    assert.ok(value > 0);
    assert.ok(value !== 2);
    assert.strictEqual(value, 1);
    assert.notEqual(value, 3);
    expect(value).toBe(1);
  });
});
