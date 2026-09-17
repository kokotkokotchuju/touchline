import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const directory = resolve(process.env.BACKUP_DIR ?? "./backups");

async function main() {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".dump"))
    .sort()
    .reverse();
  if (!files[0]) throw new Error("No database dump was found.");
  const backup = join(directory, files[0]);
  const details = await stat(backup);
  if (details.size < 1) throw new Error("The latest database dump is empty.");
  await execFileAsync("pg_restore", ["--list", backup], {
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  console.info(
    JSON.stringify({
      event: "database_backup_verified",
      file: backup,
      bytes: details.size,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "database_backup_verification_failed",
      message: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
