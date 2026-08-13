import { setTimeout } from "node:timers";

export interface RetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, nextAttempt: number, delayMs: number) => void | Promise<void>;
  sleep?: (delayMs: number) => Promise<void>;
}

const defaultSleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

/**
 * 通用指数退避重试器。默认不重试，调用方必须显式声明 shouldRetry，
 * 避免把非幂等业务操作误重试。
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 1;
  const initialDelayMs = options.initialDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  const backoffFactor = options.backoffFactor ?? 2;
  const shouldRetry = options.shouldRetry ?? (() => false);
  const sleep = options.sleep ?? defaultSleep;

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("attempts must be a positive integer");
  }
  if (initialDelayMs < 0 || maxDelayMs < 0 || backoffFactor < 1) {
    throw new Error("retry delay and backoff options must be non-negative");
  }

  let attempt = 1;
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delayMs = Math.min(
        maxDelayMs,
        Math.round(initialDelayMs * backoffFactor ** (attempt - 1))
      );
      await options.onRetry?.(error, attempt + 1, delayMs);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}
