# Phase 1 verification

Verified locally on 2026-09-15 using Windows, Node 24 and Chrome. **Phase 1 acceptance is complete for the local development environment.** This is the Phase 1 checkpoint; subsequent database work is recorded in [Phase 2 verification](PHASE_2_VERIFICATION.md).

| Check                                 | Result                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application                           | Running at `http://127.0.0.1:3000`; production build also exercised by Playwright                                                                                                |
| ESLint / strict TypeScript / Prettier | Passed                                                                                                                                                                           |
| Vitest                                | 38 tests passed: data validation/filtering, SQL integrity, provider identity, cache failures, readiness and URL validation                                                       |
| Production build                      | Passed                                                                                                                                                                           |
| Production browser tests              | 15 passed across desktop 1440px, tablet 820px and mobile 390px; includes axe scans, navigation, saves, dates, filters, dialog, empty states and production-only 404 behavior     |
| Component reference                   | Keyboard tabs, search/clear, filters, dates and retry interaction passed at all three sizes; zero axe violations or browser page errors                                          |
| Narrow layout check                   | Home, directory and component reference have no horizontal page overflow at 320px                                                                                                |
| Prisma                                | Client generation and schema validation passed; migration status is up to date                                                                                                   |
| PostgreSQL                            | Local Prisma/PGlite server on 5432; actual migration applied, repeat deployment reported no pending migrations, schema comparison reported no difference, Prisma query succeeded |
| Redis protocol connection             | Local Memurai for Redis 4.2.3 / Redis API 7.4.9 on 127.0.0.1:6379; real ping/write/read/delete probe passed; no probe keys remained                                              |
| Local Redis configuration             | Verified loopback binding and 64 MB memory limit; replaceable cache with disk persistence disabled                                                                               |
| Health endpoints                      | Liveness 200; readiness 200 with `database: up`, `redis: up`                                                                                                                     |
| Redis outage and recovery             | Stopped the verified workspace runtime: readiness returned 503 with `redis: down`; restarted it and verified healthy connectivity again                                          |
| Dependency audit                      | Zero reported vulnerabilities at verification time                                                                                                                               |
| Browser bundle inspection             | No private configuration names or PostgreSQL connection strings found in 15 production JavaScript chunks                                                                         |
| Remote CI / managed services          | Prepared but not executed or provisioned here                                                                                                                                    |

## Reproduce and understand the scope

Follow [local service setup](LOCAL_SERVICES.md) for startup and stop commands, the verified Windows package source, and vendor development license limits. Run `npm.cmd run infra:check` to check both services again; simulated unit tests are separate from that real connection check.

PostgreSQL verification uses Prisma's local PGlite development service. Redis protocol verification uses the Windows-compatible Memurai development runtime, not a managed production deployment. Browser emulation does not establish physical-device or Safari compatibility. These development services do not make the website production-deployed.

Only the foundation is implemented. The complete database schema, expanded statuses, migrations and persisted development seed belong to Phase 2. No live provider integration, synchronization, account system or deployment has begun. Wait for **“Continue to Phase 2”**, then complete only its specified database work and stop again.
