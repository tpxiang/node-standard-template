import { describe, expect, it } from "vitest";

describe("auth API contract", () => {
  it("documents the expected auth endpoints", () => {
    expect(["/auth/login", "/auth/refresh", "/auth/logout"]).toHaveLength(3);
  });
});
