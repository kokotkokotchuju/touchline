import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readInfrastructureConfig } from "../src/server/infrastructure/config";

const execFileAsync = promisify(execFile);
const outputDirectory = resolve(process.env.BACKUP_DIR ?? "./backups");

async function main() {
  const { DATABASE_URL } = readInfrastructureConfig();
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required for backups.");
  await mkdir(outputDirectory, { recursive: true });
  const filename = `touchline-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const output = join(outputDirectory, filename);
  await execFileAsync(
    "pg_dump",
    ["--format=custom", "--no-owner", "--file", output, DATABASE_URL],
    {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  const result = await stat(output);
  if (result.size < 1) throw new Error("Backup completed with an empty file.");
  console.info(
    JSON.stringify({
      event: "database_backup_completed",
      file: output,
      bytes: result.size,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "database_backup_failed",
      message: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
