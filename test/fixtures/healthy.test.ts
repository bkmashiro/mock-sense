import assert from "node:assert/strict";

const serviceMock = { send: () => "ok" };
const dbMock = { get: () => "value" };

serviceMock.send = jest.fn();
dbMock.get = vi.fn();

assert.equal(1 + 1, 2);
assert.ok("value".length > 0);
expect("a").toBe("a");
assert.strictEqual(3, 1 + 2);
assert.equal("x".toUpperCase(), "X");
assert.ok(Array.isArray([]));
assert.strictEqual(false, Boolean(0));
expect(5).toBe(5);
