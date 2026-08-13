/**
 * 为外部依赖调用提供统一超时控制。
 * 超时后会主动 reject，避免请求长期占用连接或 Worker 槽位。
 */
import { clearTimeout, setTimeout } from "node:timers";

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive integer");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
