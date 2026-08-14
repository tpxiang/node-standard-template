import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { AuthService } from "./auth.service";
import { AuthLoginRateLimitService } from "./auth-login-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";

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
    verifyAsync: vi.fn(),
    decode: vi.fn()
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
    incrementWithTtl: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
    set: vi.fn()
  };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.incrementWithTtl.mockResolvedValue(1);
    redis.incr.mockResolvedValue(1);
    redis.ttl.mockResolvedValue(900);
    redis.del.mockResolvedValue(undefined);
    service = new AuthService(
      prisma as never,
      auditService as never,
      new AuthLoginRateLimitService(redis as never),
      new AuthTokenService(
        prisma as never,
        jwtService as never,
        configService as never,
        redis as never
      )
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

    expect(redis.incrementWithTtl).toHaveBeenCalled();
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

  it("revokes refresh token and blacklists access token on logout", async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 600 });
    redis.set.mockResolvedValue(undefined);

    await expect(
      service.logout("refresh-token-value-123456", "access-token-value")
    ).resolves.toEqual({
      revoked: true
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining("auth:access:blacklist:"),
      "1",
      expect.any(Number)
    );
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

  it("commits session revocation before rejecting refresh token reuse", async () => {
    let transactionCallbackRejected = false;
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: "rt-1",
          userId: "user-1",
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "user-1", email: "admin@example.com", status: "ACTIVE", roles: [] }
        }),
        updateMany
      }
    };
    prisma.$transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => {
      try {
        return await fn(tx);
      } catch (error) {
        transactionCallbackRejected = true;
        throw error;
      }
    });
    jwtService.verifyAsync.mockResolvedValue({ type: "refresh", sub: "user-1", tokenId: "rt-1" });

    await expect(service.refresh("stolen-refresh-token")).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_REUSED
    });
    expect(transactionCallbackRejected).toBe(false);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });
});
