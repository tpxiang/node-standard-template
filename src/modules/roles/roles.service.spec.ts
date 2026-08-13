import { describe, expect, it, vi } from "vitest";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { RolesService } from "./roles.service";

describe("RolesService", () => {
  it("lists roles with pagination", async () => {
    const prisma = {
      role: {
        findMany: vi.fn().mockResolvedValue([{ id: "r1", name: "admin" }]),
        count: vi.fn().mockResolvedValue(1)
      }
    };

    await expect(
      new RolesService(prisma as never).list({
        page: 1,
        pageSize: 20,
        sortOrder: "asc"
      })
    ).resolves.toEqual({
      items: [{ id: "r1", name: "admin" }],
      total: 1,
      page: 1,
      pageSize: 20
    });
  });

  it("assigns a role to a user", async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: "user-1" }) },
      role: { findUnique: vi.fn().mockResolvedValue({ id: "role-1" }) },
      userRole: { upsert: vi.fn().mockResolvedValue({}) }
    };

    await expect(new RolesService(prisma as never).assignUser("user-1", "role-1")).resolves.toEqual(
      { userId: "user-1", roleId: "role-1" }
    );
  });

  it("throws when role is missing", async () => {
    const prisma = {
      role: { findUnique: vi.fn().mockResolvedValue(null) }
    };

    await expect(new RolesService(prisma as never).findById("missing")).rejects.toMatchObject({
      code: ErrorCode.ROLE_NOT_FOUND
    });
    await expect(new RolesService(prisma as never).findById("missing")).rejects.toBeInstanceOf(
      BusinessException
    );
  });
});
