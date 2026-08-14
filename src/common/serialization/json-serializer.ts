import { Prisma } from "@prisma/client";

/** API/cache JSON contract: UTC dates and lossless numeric values. */
export function toJsonValue<T>(value: T): T {
  return normalize(value, new WeakSet<object>()) as T;
}

function normalize(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Circular JSON value");
    seen.add(value);
    const result = value.map((entry) => normalize(entry, seen));
    seen.delete(value);
    return result;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) throw new TypeError("Circular JSON value");
    seen.add(value);
    const result = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalize(entry, seen)])
    );
    seen.delete(value);
    return result;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(toJsonValue(value));
}
