import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "../../common/constants/error-codes";
import { UsersService } from "./users.service";
import { requestContext } from "../../common/context/request-context";

describe("UsersService.create", () => {
  beforeEach(() => requestContext.enterWith({ requestId: "test", tenantId: "tenant_default" }));
  it("maps a concurrent unique-email write to a business conflict", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("duplicate", {
            code: "P2002",
            clientVersion: "test"
          })
        )
      },
      $transaction: vi.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "test"
        })
      )
    };

    await expect(
      new UsersService(prisma as never).create({
        email: "same@example.com",
        name: "Same",
        password: "ChangeMe123!"
      })
    ).rejects.toMatchObject({ code: ErrorCode.USER_ALREADY_EXISTS });
  });

  it("lists users with pagination and an allowlisted sort field", async () => {
    const item = {
      id: "user-1",
      email: "user@example.com",
      name: "User",
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([item]),
        count: vi.fn().mockResolvedValue(1)
      }
    };
    const result = await new UsersService(prisma as never).list({
      page: 1,
      pageSize: 20,
      sortBy: "email",
      sortOrder: "asc"
    });
    expect(result.items).toEqual([item]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { email: "asc" }, skip: 0, take: 20 })
    );
  });

  it("finds and updates a user without exposing the password hash", async () => {
    const user = {
      id: "user-1",
      email: "user@example.com",
      name: "Updated",
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(user),
        update: vi.fn().mockResolvedValue(user)
      }
    };
    await expect(
      new UsersService(prisma as never).update({ id: "user-1", name: "Updated" })
    ).resolves.toEqual(user);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Updated" },
        select: expect.not.objectContaining({ passwordHash: true })
      })
    );
  });
});
