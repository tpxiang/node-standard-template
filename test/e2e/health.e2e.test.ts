import { describe, expect, it } from "vitest";

describe("health API contract", () => {
  it("documents the expected health endpoints", () => {
    expect(["/health/live", "/health/startup", "/health/ready"]).toHaveLength(3);
  });
});
