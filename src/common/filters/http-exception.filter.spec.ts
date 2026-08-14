import { describe, expect, it } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  it("maps an HttpException to the standard error envelope", () => {
    const sent: unknown[] = [];
    const response = {
      status: () => ({
        send: (value: unknown) => sent.push(value)
      })
    };
    const request = {
      headers: {
        "x-request-id": "request-1"
      },
      url: "/health/live",
      method: "GET"
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request
      })
    };

    new HttpExceptionFilter().catch(
      new HttpException("Invalid", HttpStatus.BAD_REQUEST),
      host as never
    );

    expect(sent[0]).toMatchObject({
      success: false,
      message: "Invalid",
      requestId: "request-1"
    });
  });

  it("maps Prisma unique conflicts without leaking database details", () => {
    const sent: unknown[] = [];
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ send: (value: unknown) => sent.push(value) }) }),
        getRequest: () => ({ headers: {}, url: "/users/create", method: "POST" })
      })
    };
    new HttpExceptionFilter().catch(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test"
      }),
      host as never
    );
    expect(sent[0]).toMatchObject({
      code: "RESOURCE_ALREADY_EXISTS",
      message: "Resource already exists"
    });
  });
});
