// predev: ensure .env exists and the SQLite dev database schema is in sync.
import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env") && existsSync(".env.example")) {
  copyFileSync(".env.example", ".env");
  console.log("[predev] created .env from .env.example");
}

try {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
  });
} catch (err) {
  console.error("[predev] prisma db push failed");
  process.exit(1);
}
