/** API/cache JSON contract: UTC dates and lossless bigint values. */
export function toJsonValue<T>(value: T): T {
  return normalize(value) as T;
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalize(entry)])
    );
  }
  return value;
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(toJsonValue(value));
}
