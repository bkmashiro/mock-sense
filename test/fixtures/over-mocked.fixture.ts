import assert from "node:assert/strict";

describe("over mocked test", () => {
  it("mocks a lot and asserts a little", () => {
    jest.mock("./dep1");
    jest.mock("./dep2");
    vi.mock("./dep3");
    vi.mock("./dep4");
    sinon.stub(api, "call");
    const a = jest.fn();
    const b = jest.fn();
    const c = vi.fn();
    const d = vi.fn();
    mock.service.reset();
    a.mockReturnValue(1);
    b.mockReturnValue(2);
    c.mockResolvedValue(3);
    d.mockResolvedValue(4);
    mock.client.connect();

    assert.equal(a(), 1);
    expect(b()).toBe(2);
  });
});
