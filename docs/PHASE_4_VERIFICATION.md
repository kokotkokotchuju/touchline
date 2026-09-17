# Phase 4 — Match center

The user selected Phase 4 after the completed database phase. Phase 3 provider integration remains undefined. Phase 4 implements the match center using visibly labelled PostgreSQL development samples.

## Implemented

- `/matches` opens the current UTC day; `/matches/YYYY-MM-DD` supports Yesterday, Today, Tomorrow, previous/next day and a native date picker.
- Matches group by competition country, then competition. International competitions have their own grouping.
- All, Live (including halftime), Upcoming and Finished filters combine with country and competition. Date/filter state survives reload and navigation; reset preserves the selected date/time zone.
- Kickoff times have explicit time-zone labels and include the local calendar date when conversion crosses the selected UTC day. Unconfirmed fixtures appear separately.
- `/match/[match]` resolves a stable internal public ID, permanently redirects obsolete descriptive prefixes, and returns true 404s for missing entities.
- Match detail includes score/status, competition/season, venue, kickoff, badges, period/shootout scores, tie/aggregate information, a chronological event timeline, goal assists, cards, explicit incoming/outgoing substitutions, corrected/disallowed events, lineups, formations, statistics and up to six prior completed meetings.
- Missing coverage, unknown values, provisional lineups and sample data remain explicit. API errors are sanitized; retry re-fetches failed page content.

## Architecture

PostgreSQL → provider-neutral DTO mapping → Redis cache → internal read service → pages and API. The repository reads development-provider records deliberately. There is no real-provider activation, synchronization or simulated advancing live clock.

List pages contain up to 100 matches with a stable cursor; up to six undated fixtures appear separately. Event output is capped at 2,000 with a truncation notice. Match detail statistics use full-match totals only. Head-to-head includes stored completed fixtures in either team orientation before the selected fixture and before the current time, without claiming complete history.

The Phase 1 `/api/v1/matches` demo API was replaced by the database-backed API. Its old `q` and `scheduled` filters are retired. The home page and competition directory retain their explicit preview repository. No Phase 5 competition-detail pages or Phase 6/7 profiles were built.

## Verification

Verified locally on **2026-09-16**:

| Check                                       | Result                                            |
| ------------------------------------------- | ------------------------------------------------- |
| ESLint and strict TypeScript                | Passed                                            |
| Vitest                                      | 103 tests passed across 8 files                   |
| Prettier                                    | Passed                                            |
| Next.js production build                    | Passed                                            |
| PostgreSQL match repository verification    | Passed                                            |
| PostgreSQL and Redis connection diagnostics | Both up; query and Redis write/read/delete passed |
| Production browser checks                   | 27 passed: 9 desktop, 9 tablet, 9 mobile          |

The final browser checks ran as three separate device projects, each exiting successfully. An earlier combined run passed its nine tablet checks but timed out between projects; no application test failed in that run. The initial filter test used an incorrect label locator, which was corrected to target the accessible combobox role before the successful final runs.

- Real PostgreSQL checks cover combined filters, live/halftime, unknown kickoff, detail DTOs, substitutions/assists/corrections, squads, unknown statistics, penalties, historical meetings, UTC boundaries and pagination across 103 temporary fixtures. Temporary fixture records are removed afterward.
- Browser checks cover both the existing preview and the new match center on desktop, tablet and mobile Chrome. Detail sections are scanned with axe; viewport overflow and browser errors are checked.
- Fresh and populated-upgrade migration tests from Phase 2 remain in the suite; this phase requires no schema migration.

Commands:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run matches:verify
npm.cmd run check
npm.cmd run format:check
npm.cmd run build
npm.cmd run test:e2e -- --workers=1
npm.cmd run infra:check
```

For separate device runs, use `npm.cmd run test:e2e -- --workers=1 --project=desktop`, then repeat with `--project=tablet` and `--project=mobile`.

Use the configured local PostgreSQL and Redis services. Development seeding and database verification require `ALLOW_DEVELOPMENT_SEED=true`; keep secrets in `.env.local`. Start the app with `npm.cmd run dev` and open `/matches/2026-09-15` for the fixed sample dataset.

## Limits

The local PostgreSQL development service uses PGlite with the PostgreSQL wire protocol. Native PostgreSQL 17/Redis CI is configured but has not run remotely from this workspace. Prisma's current PostgreSQL adapter emits a non-failing `pg` deprecation warning during relation reads inside a transaction; the configured driver remains on major version 8. Hosted-service and live-provider verification remain later work.

**Stop after Phase 4. Await the instruction to continue to Phase 5.**
