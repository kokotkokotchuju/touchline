# Touchline

A global football platform, built one verified phase at a time.

**Foundation, database, match center and competition pages.** Match and competition pages currently read labelled PostgreSQL development samples through server repositories and Redis caching. The workspace also contains provider synchronization, search, basic team routes, accounts and deployment modules. The latest project check preserves these additions and repairs their integration; this is not a claim that every later phase is complete. See [project check](docs/PROJECT_CHECK.md).

## Run locally

Requirements: **Node.js 24 LTS** and npm. XAMPP's Apache does not run this application; Next.js runs its own Node server.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). On macOS/Linux, use `npm` instead of `npm.cmd`. The `.cmd` form avoids PowerShell's script execution restriction. Database-backed pages need the services configured below. Fonts and illustrative marks are bundled locally.

## PostgreSQL and Prisma

The home page defaults to provider-synchronized database records. If no provider records have been synchronized, its empty state is expected. For the labelled home preview, explicitly set `FOOTBALL_READ_MODE=demo` with `ALLOW_DEVELOPMENT_SEED=true`; tests set these independently and never change `.env.local`. The match center and competition pages currently use the persisted development samples. No provider API is called by `/api/v1/live`; it reads synchronized live/halftime records through Redis and SQL.

`npm.cmd run dev` uses local development configuration. `npm.cmd run start` runs the production build and enforces the deployment settings in [Deployment](docs/DEPLOYMENT.md). Browser tests supply isolated test settings for their production server on port 3100. They do not use production passwords or execute synchronization jobs.

Copy `.env.example` to `.env.local` if that file does not already exist. Never commit secrets or prefix them with `NEXT_PUBLIC_`.

For local development, run this in a separate terminal:

```powershell
npm.cmd run db:local
```

This starts Prisma's local PostgreSQL development server on port 5432 with a shadow database on 5433. It uses PGlite and exposes the PostgreSQL wire protocol; it is a development service, not hosted production PostgreSQL. Set `DATABASE_URL` in `.env.local` to the direct `postgres://` URL it prints. This workspace already has that local URL configured in its ignored environment file. Do not share the printed connection URL.

For managed PostgreSQL, use the host's recommended TLS connection string. The Prisma adapter has a small connection pool; deployment-specific pooling and migration credentials should be reviewed when a host is chosen.

```powershell
npm.cmd run db:generate
npm.cmd run db:validate
npm.cmd run db:migrate
npm.cmd run db:status
```

`db:generate` generates Prisma Client, **not a migration**. Future schema changes use `npx.cmd prisma migrate dev --name descriptive_name` against a development database. Review the SQL before `db:migrate` applies committed migrations. Preserve the SQL-only checks and partial indexes described in [Database design](docs/DATABASE.md). Never reset or baseline an existing database without inspecting its history.

The schema requires **PostgreSQL 15 or newer** for uniqueness across nullable contexts. Both fresh installation and a populated Phase 1 upgrade are tested; existing IDs, scores and provider mappings are preserved.

## Development database samples

Set `ALLOW_DEVELOPMENT_SEED=true` in `.env.local` for your selected **development** database, then run:

```powershell
npm.cmd run db:seed
npm.cmd run db:verify
```

The seed creates 4 sample competitions, 5 seasons, 8 teams, 38 players and 15 matches, plus managers, venues, registrations, lineups, events, standings, statistics and provider mappings. It includes all seven match statuses, historical meetings, groups, two-leg ties and penalties. The fixed reference date is **2026-09-15 UTC**; these are synthetic examples, not live results. Optional asset URLs remain empty.

Seeding runs in one transaction, requires explicit opt-in, refuses `NODE_ENV=production`, and upserts only stable sample IDs. Repeating it restores sample values without deleting other records. Use a dedicated development database: collisions with existing unique country codes or slugs fail atomically rather than merging unrelated identities. Prisma 7 seeding is explicit; migrations do not seed automatically.

`db:verify` re-seeds twice, compares IDs and counts across the core tables, reads nested relations, and verifies Prisma CRUD, constraints and cascades inside a rolled-back transaction. Match public ID sequences may have harmless gaps after rollback. The persisted seed powers the match center and competition pages. The home page's separate preview repository requires explicit demo mode. Phase 5 extends the seed with historical standings, tied group ranks and season/team metrics; run the guarded seed again when upgrading a development workspace. No new migration is required for Phase 5.

## Redis and health checks

Set **one** of these in `.env.local`:

- `REDIS_URL`: a `redis://` local connection or `rediss://` managed TLS connection.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: the managed REST alternative, configured together.

```powershell
npm.cmd run infra:check
```

This performs a real Prisma query and Redis ping/write/read/delete with a unique key and 15-second expiry. It exits unsuccessfully if either service is missing or down. It never prints connection secrets. Restart Next.js after changing service configuration.

This workspace has a local Memurai development service running on `127.0.0.1:6379`. It passed the real Redis ping/write/read/delete check. Restart it with `npm.cmd run redis:local` when needed. See [local service setup](docs/LOCAL_SERVICES.md) for installation, restart/stop commands and development license limits. Managed production services remain later work.

| Route                                                        | Purpose                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `/`                                                          | Responsive football UI preview                                                    |
| `/competitions`                                              | SQL competition directory with name/country/region search and type filters        |
| `/competition/[competition]`                                 | Competition overview; `/standings`, `/matches`, `/stats` sections                 |
| `/competition/[competition]/season/[season]`                 | Explicit season with the same section suffixes                                    |
| `/api/v1/competitions`, `/api/v1/competitions/[competition]` | Normalized competition directory and scoped page data                             |
| `/design-system`                                             | Development-only reusable component reference; 404 in production                  |
| `/matches`, `/matches/YYYY-MM-DD`                            | SQL-backed match browsing by UTC date, status, competition and country            |
| `/match/[match]`                                             | Score, timeline, lineups, statistics and available head-to-head                   |
| `/api/v1/matches/[publicId]`                                 | Normalized match detail using the internal public ID                              |
| `/api/v1/matches`                                            | Filtered, paginated SQL match DTOs with explicit development-source metadata      |
| `/api/health`                                                | Application liveness; 200 does not imply database/Redis readiness                 |
| `/api/health/ready`                                          | Read-only PostgreSQL and Redis readiness; 200 only if both respond, otherwise 503 |

API example: `/api/v1/matches?date=2026-09-15&status=live&country=england`. Status is `all`, `live` (including halftime), `upcoming` or `finished`; `competition` and `country` use stored slugs, with `international` for competitions without a country. Optional `timeZone` changes display preferences while the selected date remains a UTC day. Use the returned `meta.nextCursor` for another page of up to 100 matches. Undated fixtures are returned separately. Unknown/repeated parameters return 400; unavailable reads return 503. Responses use `Cache-Control: no-store`; server data is cached in Redis for 15 seconds. This replaces the Phase 1 demo API; its `q` parameter and `scheduled` filter are no longer supported.

Open [the seeded match center](http://localhost:3000/matches/2026-09-15) and select a match. URLs use internal public IDs and permanently redirect outdated descriptive prefixes. Sample scores and minutes do not update live. Saved matches still belong to the Phase 1 browser-local preview; match-center account follows and provider refresh are later work.

## Verification

```powershell
npm.cmd run format:check
npm.cmd run check
npm.cmd run matches:verify
npm.cmd run competitions:verify
npm.cmd run build
npm.cmd run test:e2e -- --workers=1
npm.cmd run infra:check
npm.cmd audit
```

`check` runs ESLint, strict TypeScript and Vitest. SQL integrity tests execute both migrations in PGlite, including a populated upgrade; mocked cache/readiness tests cover failure behavior and do not prove a live Redis connection. `db:verify` checks the configured PostgreSQL service through Prisma, and `infra:check` checks both real services.

Playwright exercises the production build on port 3100 at desktop, tablet and mobile sizes, including axe accessibility scans. It uses Chrome; install it with `npx.cmd playwright install chrome` if necessary. Emulation does not replace testing Safari or physical phones.

The GitHub Actions workflow provisions PostgreSQL and Redis service containers before migrations and diagnostics. That workflow is prepared but has not been executed remotely from this workspace. Its fixed password is only for an ephemeral CI database. Dependency overrides update Prisma's transitive `deepmerge-ts` and `mysql2` packages to patched versions; Prisma generation, validation and migration commands are verified with those overrides.

`matches:verify` exercises the real PostgreSQL read repository, filters, detail mappings, UTC boundaries and 103-row pagination. It requires the development seed opt-in, creates temporary fixtures and removes only those fixtures in a `finally` cleanup.

`competitions:verify` checks historical seasons, standings/form/points adjustments, groups, knockout progression/shootouts, exact statistic scopes, player totals across team spells, unknown values and paginated fixtures. It removes temporary statistic/fixture records afterward. Run database verifiers separately from browser tests so temporary fixtures cannot affect visible result counts.

## Competition pages

Open [the competition directory](http://localhost:3000/competitions), [sample league](http://localhost:3000/competition/demo-premier-league), or [mixed group/knockout competition](http://localhost:3000/competition/demo-continental-cup/standings). Season, stage and group selections are shareable. Historical example: `/competition/demo-premier-league/season/2025-26/standings`.

- Standings retain all eleven requested columns, stored ranking, tied positions, adjusted points and oldest-to-newest form. Narrow screens keep team names visible while the table scrolls.
- Fixtures include scheduled/postponed matches; results include finished matches. Live, halftime, cancelled and abandoned fixtures appear under All matches. Kickoff times use UTC; unknown dates sort last.
- Mixed competitions show separate group tables and knockout rounds with authoritative aggregates, winner/progression and linked legs. Penalties are separate from match/aggregate scores.
- Top scorers/assists use one exact season/stage/group context. Match, home/away and subgroup values never inflate season totals. Player totals combine canonical team spells once; any unknown spell leaves the total unknown. Missing team metrics stay unknown, and possession ratios are never summed.

Directory API: `/api/v1/competitions?q=England&kind=league&page=1` (24 rows/page). Detail API: `/api/v1/competitions/demo-continental-cup?season=2026-27&section=standings&stage=group-stage&group=a`. Sections: `overview`, `standings`, `matches`, `stats`; matches additionally accept `view=all|fixtures|results` and `page` (30 rows/page). `group` requires its parent `stage`. Page numbers range from 1–9999. Invalid/repeated parameters return 400, unknown selections 404, unavailable reads 503. Responses use `no-store`; normalized server results cache for 30 seconds with SQL fallback when Redis is unavailable. These reads do not call a football provider.

## Important files

| Path                                                                                   | Responsibility                                                             |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/`                                                                             | App Router pages, global loading/error boundaries and internal endpoints   |
| `src/components/`, `src/styles/`                                                       | Reusable UI, responsive football layout and design tokens                  |
| `src/lib/football/`                                                                    | Public DTOs and pure filtering/date utilities                              |
| `src/server/football/providers/`                                                       | Provider-neutral ingestion contract and normalized models                  |
| `src/server/football/repositories/`                                                    | Read contracts, PostgreSQL match center and separate preview repository    |
| `src/server/infrastructure/`                                                           | Validated private config, Prisma/Redis connections and readiness           |
| `prisma/schema.prisma`, `prisma/migrations/`                                           | Complete core schema and reviewed SQL migrations                           |
| `prisma/development-data.ts`, `prisma/seed.ts`                                         | Deterministic synthetic sample data and guarded seed entry point           |
| `src/server/football/match-center-service.ts`, `repositories/postgres-match-center.ts` | SQL read boundary, normalization and short Redis cache                     |
| `src/lib/football/match-center.ts`                                                     | Public match-center DTOs, validation and date/URL helpers                  |
| `src/components/football/match-center-*.tsx`, `src/styles/match-center.css`            | Responsive match browsing, scoreboard, timeline, formations and statistics |
| `scripts/verify-database.ts`                                                           | Real Prisma seed, relations, CRUD and rollback verification                |
| `src/lib/football/competition-center.ts`                                               | Competition DTOs, validation and section/season URLs                       |
| `src/server/football/repositories/postgres-competitions.ts`                            | Scoped SQL reads and bounded standings, matches, ties and leaderboards     |
| `src/server/football/competition-service.ts`, `competition-api.ts`                     | Redis read service and validated competition API                           |
| `src/components/football/competition-*.tsx`, `src/styles/competition-center.css`       | Directory, selectors, tables, rounds and statistics                        |
| `scripts/verify-competitions.ts`, `tests/e2e/competitions.spec.ts`                     | Database and responsive browser verification for Phase 5                   |
| `scripts/check-infrastructure.ts`                                                      | Real connection diagnostics                                                |
| `tests/`, `.github/workflows/ci.yml`                                                   | Regression checks and future CI                                            |

## Decisions and next phase

- Next.js App Router, React, TypeScript and Tailwind; one application and server layer for now.
- PostgreSQL with Prisma, stable UUIDs, and separate provider identifiers.
- Redis cache-aside with timeouts and source fallback; SQL will remain authoritative.
- Provider adapters normalize responses before synchronization. The frontend only receives our DTOs.
- Reusable sports UI with accessible interactions; complete team/player phase requirements remain pending.
- The current account module uses server-side sessions and same-origin mutation checks; see the project check for tested behavior and limits.

See [Architecture](docs/ARCHITECTURE.md), [Database design](docs/DATABASE.md), [URL design](docs/URLS.md), [Design system](docs/DESIGN_SYSTEM.md), [Phase 1 verification](docs/PHASE_1_VERIFICATION.md), [Phase 2 verification](docs/PHASE_2_VERIFICATION.md), [Phase 4 verification](docs/PHASE_4_VERIFICATION.md), [Phase 5 verification](docs/PHASE_5_VERIFICATION.md), and [Roadmap](docs/ROADMAP.md).

**Stop after the verified Phase 5 delivery and wait for the instruction to continue to Phase 6.** Phase 6 will build team overview, matches, squad and statistics pages. Phase 3 provider integration remains separately scoped; Phases 6 through 9 are recorded in the roadmap.
