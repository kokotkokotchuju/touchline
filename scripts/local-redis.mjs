import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const stateDirectory = resolve(projectRoot, ".local/redis");
const executable =
  process.platform === "win32"
    ? resolve(projectRoot, ".local/memurai/Memurai/memurai.exe")
    : "redis-server";

if (process.platform === "win32" && !existsSync(executable)) {
  console.error(
    "Local Memurai runtime is missing. Follow docs/LOCAL_SERVICES.md to set it up, or configure a managed REDIS_URL.",
  );
  process.exitCode = 1;
} else {
  mkdirSync(stateDirectory, { recursive: true });
  const child = spawn(
    executable,
    [resolve(projectRoot, "config/redis.local.conf")],
    { cwd: stateDirectory, stdio: "inherit", windowsHide: true },
  );
  child.on("error", () => {
    console.error(
      "Unable to start local Redis. Check the runtime installation.",
    );
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
}
