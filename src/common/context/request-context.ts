import { AsyncLocalStorage } from "node:async_hooks";

/** 单次请求内可读取的上下文（日志、审计、Outbox 元数据等）。 */
export interface RequestContextStore {
  requestId: string;
  userId?: string;
  tenantId?: string;
  clientIp?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function setRequestUserId(userId: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.userId = userId;
  }
}

export function setRequestTenantId(tenantId: string): void {
  const store = requestContext.getStore();
  if (store) store.tenantId = tenantId;
}

export function getRequestUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

export function getRequestTenantId(): string | undefined {
  return requestContext.getStore()?.tenantId;
}

export function requireRequestTenantId(): string {
  const tenantId = getRequestTenantId();
  if (!tenantId) throw new Error("Tenant context is required");
  return tenantId;
}
