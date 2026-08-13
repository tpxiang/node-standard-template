import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    refreshToken: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn()
    },
    $transaction: vi.fn()
  };

  const jwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn()
  };

  const configService = {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, string> = {
        "auth.accessSecret": "access-secret",
        "auth.refreshSecret": "refresh-secret",
        "auth.accessExpiresIn": "15m",
        "auth.refreshExpiresIn": "7d"
      };
      return values[key];
    })
  };

  const auditService = {
    create: vi.fn()
  };

  const redis = {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn()
  };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);
    redis.ttl.mockResolvedValue(900);
    redis.del.mockResolvedValue(undefined);
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      auditService as never,
      redis as never
    );
  });

  it("rejects login when Redis rate limit is exceeded", async () => {
    redis.get.mockResolvedValue("5");

    await expect(
      service.login({ email: "admin@example.com", password: "ChangeMe123!" })
    ).rejects.toMatchObject({
      code: ErrorCode.AUTH_RATE_LIMITED
    });
  });

  it("records failure and rejects invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: "missing@example.com", password: "ChangeMe123!" })
    ).rejects.toBeInstanceOf(BusinessException);

    expect(redis.incr).toHaveBeenCalled();
    expect(redis.expire).toHaveBeenCalled();
  });

  it("issues token pair on successful login", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("ChangeMe123!", 4);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      passwordHash: hash,
      status: "ACTIVE",
      roles: [
        {
          role: {
            name: "admin",
            permissions: [{ permission: { code: "user:write" } }]
          }
        }
      ]
    });
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token-value-123456");

    const result = await service.login({
      email: "admin@example.com",
      password: "ChangeMe123!"
    });

    expect(result.tokens).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token-value-123456"
    });
    expect(result.user.permissions).toContain("user:write");
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.any(String),
        id: expect.any(String)
      })
    });
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe("pending");
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN", resource: "AUTH" })
    );
  });

  it("revokes refresh token on logout", async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.logout("refresh-token-value-123456")).resolves.toEqual({
      revoked: true
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it("rejects invalid refresh token type", async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-1",
      tokenId: "rt-1",
      type: "access"
    });

    await expect(service.refresh("some-refresh-token-xx")).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_INVALID
    });
  });
});
