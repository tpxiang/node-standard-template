import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { getRequestTenantId, requestContext } from "../../../common/context/request-context";
import { TenantGuard } from "./tenant.guard";

describe("TenantGuard", () => {
  it("requires X-Tenant-Id", async () => {
    const guard = new TenantGuard({} as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {}, user: { id: "user-1" } }) })
    };
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("loads tenant roles and writes tenant context", async () => {
    requestContext.enterWith({ requestId: "test" });
    const request = {
      headers: { "x-tenant-id": "tenant-1" },
      user: { id: "user-1", email: "u@example.com", roles: [], permissions: [] }
    };
    const prisma = {
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({
          status: "ACTIVE",
          tenant: { status: "ACTIVE" },
          roles: [
            {
              role: {
                tenantId: "tenant-1",
                name: "admin",
                permissions: [{ permission: { code: "user:read" } }]
              }
            }
          ]
        })
      }
    };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };
    await expect(new TenantGuard(prisma as never).canActivate(context as never)).resolves.toBe(
      true
    );
    expect(request.user.permissions).toEqual(["user:read"]);
    expect(getRequestTenantId()).toBe("tenant-1");
  });
});
