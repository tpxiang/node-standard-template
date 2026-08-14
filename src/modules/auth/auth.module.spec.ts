import { MODULE_METADATA } from "@nestjs/common/constants";
import { JwtModule } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { AuthModule } from "./auth.module";

describe("AuthModule", () => {
  it("exports JwtModule for guards consumed by feature modules", () => {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule) as unknown[];

    expect(exports).toContain(JwtModule);
  });
});
