import { describe, expect, it } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
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
});
