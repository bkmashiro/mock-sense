import assert from "node:assert/strict";

jest.mock("alpha");
vi.mock("beta");
sinon.stub(api, "fetch");
const one = jest.fn();
const two = vi.fn();
mock.client = true;
service.mockReturnValue("x");
service.mockResolvedValue("y");
jest.mock("gamma");
vi.mock("delta");
sinon.stub(api, "save");
const three = jest.fn();
const four = vi.fn();
mock.worker = false;
handler.mockReturnValue("z");

assert.ok(result);
expect(status).toBe("ok");
