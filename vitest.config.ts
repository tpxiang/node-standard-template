import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    include: ["test/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/common/interceptors/*.ts",
        "src/common/reliability/*.ts",
        "src/infrastructure/cache/*.service.ts",
        "src/infrastructure/redis/distributed-lock.service.ts",
        "src/modules/auth/*.service.ts",
        "src/modules/roles/*.service.ts",
        "src/modules/users/*.service.ts"
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
