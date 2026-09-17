# Local development services

Phase 1 runs Next.js on port 3000, Prisma's local PostgreSQL development server on 5432, and a Redis-compatible Memurai development instance on 6379. These are local development services; production hosting and managed services remain later work.

## Start and verify

The services are already running in this workspace. After stopping them or restarting Windows, run these commands in separate terminals from the project root:

```powershell
npm.cmd run db:local
npm.cmd run redis:local
npm.cmd run dev
```

Keep those terminals open. An occupied port usually means the service is already running; inspect it before starting another copy. Use Ctrl+C to stop a foreground service.

`.env.local` already contains the direct local PostgreSQL URL and `REDIS_URL=redis://127.0.0.1:6379`. Its contents are ignored by version control. Restart Next.js after changing connection values.

```powershell
npm.cmd run db:status
npm.cmd run infra:check
```

Both service statuses must be `up`. The diagnostic performs a Prisma query plus a Redis ping and expiring write/read/delete probe. `/api/health/ready` returns 200 only while both connections work; `/api/health` checks application liveness.

## Windows Redis runtime

[Redis documents Memurai as its native Windows-compatible option](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/windows/). This workspace uses Memurai for Redis **4.2.3**, reporting Redis API **7.4.9**. The official MSI and executable signatures were checked and were valid for Janea Systems. The package was extracted into `.local/memurai`; no Windows service, firewall rule or machine PATH change was created.

`config/redis.local.conf` binds only `127.0.0.1`, enables protected mode, caps cache memory at 64 MB, evicts least-recently-used entries when full, and disables disk persistence. Restarting it clears this development cache. `scripts/local-redis.mjs` launches the runtime using `.local/redis` as its writable working directory.

The bundled license is for development/testing, enables vendor telemetry, expires on 2028-04-30, and has a ten-day shutdown limitation. See the bundled license/EULA and [vendor edition limits](https://www.memurai.com/get-memurai). Use an appropriate managed Redis service for production.

To stop the background development instance started during setup:

```powershell
& ./.local/memurai/Memurai/memurai-cli.exe -h 127.0.0.1 -p 6379 shutdown nosave
```

This command targets the local cache on port 6379. Restart it with `npm.cmd run redis:local`.

## Reproduce the Windows runtime on another checkout

1. Download the stable **LTS Developer Edition** from the [official download page](https://www.memurai.com/get-memurai). Its download button issues a temporary link; a copied unsigned CDN URL will fail.
2. Create `.local` and place the downloaded `Memurai-for-Redis-v4.2.3.msi` there. Vendor binaries and license files stay ignored, outside application source and public assets.
3. Verify and extract the package using PowerShell from the project root:

```powershell
$ErrorActionPreference = 'Stop'
$taskInstaller = (Resolve-Path -LiteralPath '.local/Memurai-for-Redis-v4.2.3.msi').Path
if ((Get-AuthenticodeSignature -LiteralPath $taskInstaller).Status -ne 'Valid') {
    throw 'Installer signature is not valid.'
}
$taskImage = Join-Path (Get-Location).Path '.local/memurai'
$taskExtraction = Start-Process msiexec.exe -ArgumentList @(
    '/a', ('"' + $taskInstaller + '"'), '/qn', ('TARGETDIR="' + $taskImage + '"')
) -Wait -PassThru -WindowStyle Hidden
if ($taskExtraction.ExitCode -ne 0) { throw 'Package extraction failed.' }
```

4. Confirm `.local/memurai/Memurai/memurai.exe` has a valid publisher signature and that its bundled developer license is compatible. Start `npm.cmd run redis:local`, configure `.env.local`, and run the diagnostic. Recheck paths/license compatibility if using a newer release.

On macOS/Linux the same launcher uses an installed `redis-server` executable with the same local configuration. The CI workflow independently starts PostgreSQL and Redis containers. No vendor executable is included in the Next.js build.
