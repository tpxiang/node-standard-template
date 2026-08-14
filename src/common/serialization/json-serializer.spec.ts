import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { stringifyJson, toJsonValue } from "./json-serializer";

describe("json serializer", () => {
  it("normalizes UTC dates and bigint values recursively", () => {
    const value = toJsonValue({ createdAt: new Date("2026-01-01T00:00:00.000Z"), count: 2n });
    expect(value).toEqual({ createdAt: "2026-01-01T00:00:00.000Z", count: "2" });
    expect(stringifyJson(value)).toBe('{"createdAt":"2026-01-01T00:00:00.000Z","count":"2"}');
  });

  it("serializes Decimal and rejects circular plain objects", () => {
    expect(toJsonValue({ amount: new Prisma.Decimal("12.34") })).toEqual({ amount: "12.34" });
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => toJsonValue(circular)).toThrow(/Circular JSON value/);
  });
});
