import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readInfrastructureConfig } from "../src/server/infrastructure/config";

const execFileAsync = promisify(execFile);
const directory = resolve(process.env.BACKUP_DIR ?? "./backups");

async function main() {
  const target = process.env.BACKUP_RESTORE_DATABASE_URL;
  if (!target)
    throw new Error(
      "BACKUP_RESTORE_DATABASE_URL must point to an isolated restore-verification database.",
    );
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".dump"))
    .sort()
    .reverse();
  if (!files[0]) throw new Error("No database dump was found.");
  const backup = join(directory, files[0]);
  const details = await stat(backup);
  if (details.size < 1) throw new Error("The restore source dump is empty.");
  readInfrastructureConfig();
  await execFileAsync(
    "pg_restore",
    [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--exit-on-error",
      "--single-transaction",
      "--dbname",
      target,
      backup,
    ],
    { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
  );
  console.info(
    JSON.stringify({
      event: "database_backup_restore_verified",
      file: backup,
      bytes: details.size,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "database_backup_restore_verification_failed",
      message: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
