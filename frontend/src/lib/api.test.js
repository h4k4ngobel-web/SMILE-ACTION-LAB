jest.mock("@/lib/auth", () => ({ useSafeAuth: jest.fn() }), { virtual: true });

import { anonId } from "./api";

describe("anonId", () => {
  beforeEach(() => localStorage.removeItem("sal_anon_id"));

  it("replaces a stored identifier that the API would reject", () => {
    localStorage.setItem("sal_anon_id", "short");

    const id = anonId();

    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(localStorage.getItem("sal_anon_id")).toBe(id);
  });
});
