import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const observabilityConfig = registerAs("observability", () => ({
  metricsEnabled: (env.METRICS_ENABLED ?? "true").toLowerCase() !== "false",
  metricsToken: env.METRICS_TOKEN || undefined
}));
