import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd, env } from "node:process";

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
}

loadEnvFile(resolve(cwd(), ".env.test"));
