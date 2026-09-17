# Phase 2 verification

Phase 2 covers the database and development seed only. Verified locally on 2026-09-15 using Windows, Node 24, Prisma 7.10 and the configured local PostgreSQL development service. No external football API is required.

## Database results

| Check                           | Result                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma schema and client        | Complete 25-model schema validates and generates successfully                                                                                                                         |
| Fresh installation              | Both committed migrations execute successfully in a fresh PGlite database                                                                                                             |
| Populated Phase 1 upgrade       | Preserves UUIDs, scores, venue labels and provider mappings; backfills slugs, season participation and public match IDs                                                               |
| Configured PostgreSQL migration | Both migrations applied; migration status is current                                                                                                                                  |
| Schema comparison               | `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` reports no difference                                                                     |
| Development seed                | All 25 tables populated; stable IDs; no table reset or deletion                                                                                                                       |
| Seed repeatability              | Real Prisma verifier seeds twice and compares all table identities, row counts and match public IDs                                                                                   |
| Relational reads                | Match/team/country/venue/competition, event actors and corrections, squads/managers, groups/ties/legs, historical meetings and registrations/statistics verified                      |
| Match coverage                  | All seven statuses, unknown scores/kickoff, halftime, penalties, abandoned match, partial and unavailable feeds represented                                                           |
| Prisma CRUD                     | Country and match/detail create/read/update/delete verified against the configured database                                                                                           |
| Integrity and rollback          | Real service rejects invalid scores, outside lineup teams, duplicates and protected deletion; match-owned details cascade; verification transaction leaves no persistent test records |
| SQL integrity tests             | Additional checks cover cross-season/group relationships, nullable uniqueness, actor roles, typed statistics, points, progression and provider identity                               |
| Services                        | Real PostgreSQL query and Redis ping/write/read/delete passed                                                                                                                         |

## Sample data

The fixed reference date is **2026-09-15 UTC**. All competition/team/player names and match outcomes are synthetic. Counts after repeated seeding:

| Records                                    |          Count |
| ------------------------------------------ | -------------: |
| Countries / competitions / seasons         |      4 / 4 / 5 |
| Teams / venues / players / managers        | 8 / 6 / 38 / 8 |
| Season participants                        |             20 |
| Player registrations / manager assignments |         39 / 9 |
| Stages / groups / knockout ties            |      5 / 3 / 3 |
| Matches / score periods                    |         15 / 4 |
| Events / lineups / lineup players          |     8 / 3 / 26 |
| Standings                                  |             10 |
| Statistic definitions / contexts           |          6 / 5 |
| Team statistics / player statistics        |         6 / 17 |
| Development provider / external references |        1 / 221 |

The fixtures cover UI cases, not a complete reconciled competition history. Missing asset URLs are deliberate. The application still reads its labeled Phase 1 demo repository; a SQL repository and provider integration are future work.

## Application checks

- ESLint, strict TypeScript and Prettier pass.
- **85 Vitest tests pass** across seven files, including the migration, seed-safety and existing application tests.
- The optimized Next.js production build passes.
- **15 production Playwright tests pass** across desktop, tablet and mobile Chrome, including axe accessibility checks and existing preview interactions.
- The running development app returns HTTP 200 for `/`, `/competitions`, `/api/health` and `/api/health/ready`; readiness reports PostgreSQL and Redis up.

## Reproduce

Start the configured local database and Redis service if needed. Set `DATABASE_URL`, `REDIS_URL` and `ALLOW_DEVELOPMENT_SEED=true` in the ignored `.env.local` for a development database.

```powershell
npm.cmd run db:validate
npm.cmd run db:migrate
npm.cmd run db:status
npm.cmd run db:seed
npm.cmd run db:verify
npm.cmd run infra:check
npm.cmd run format:check
npm.cmd run check
npm.cmd run build
npm.cmd run test:e2e -- --workers=1
npm.cmd run dev
```

Seeding and database verification refuse production mode and require the explicit opt-in. Verification intentionally rolls back its temporary writes; PostgreSQL sequences may still advance, which is normal and does not change existing public IDs.

## Limits and phase boundary

The local PostgreSQL service uses PGlite with the PostgreSQL wire protocol. The CI workflow now provisions native PostgreSQL 17 and Redis containers, runs migrations, seeding and database verification, but has not been executed remotely from this workspace. Hosted-service deployment, backup/restore, production concurrency/load testing and live-provider validation remain later work.

No new match-center or competition-detail pages, SQL read repository, synchronization jobs, accounts or external data integration were added. **Stop after Phase 2. Phase 3 awaits its scope and authorization.**
