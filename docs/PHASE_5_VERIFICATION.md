# Phase 5 — Competitions

## Delivered

- PostgreSQL-backed directory with scoped search, type filters and pagination.
- Overview, standings, matches and statistics at `/competition/[competition]` and `/standings`, `/matches`, `/stats` sections.
- Explicit historical-season paths, stage/group selection and shareable filters.
- All eleven standings columns, stored ranking/tied positions, adjusted points and oldest-to-newest form.
- League/group tables and knockout rounds, linked legs, authoritative aggregates, shootouts and progression.
- Fixtures/results filters, UTC kickoff labels, unknown dates and all seven match statuses.
- Top scorers, top assists and team metrics, with exact context isolation, player team-spell totals and unknown values preserved.
- Responsive layouts, keyboard-accessible tables/selectors, navigation loading indicators, retry/error states and true 404s.

The existing schema supports this phase; no migration was necessary. Development seeding now includes historical standings and season/group team metrics. The site reads explicitly labelled synthetic data; no live provider was activated.

## Verification

Final check and production browser results will be recorded after the last run.

`competitions:verify` checks configured PostgreSQL reads, directory filters, missing selections, historical seasons, points deductions, form order, tied standings/ranks, groups, two-leg aggregates, winner progression, separate penalties, fixtures/results, exact season/group statistic contexts, non-additive ratios, totals across player team spells, unknown spells and pagination. Temporary statistic/fixture records are removed afterward. Run it separately from browser tests.

Browser checks cover all sections, historical navigation, group/knockout switching, filters, reload persistence, match links, 404s and six axe accessibility scans on desktop, tablet and mobile Chrome. Table scrolling is keyboard-tested on narrow viewports. Existing home/match-center checks remain in the suite; the old directory test now exercises its SQL replacement.

The first browser run caught a real navigation race: changing the season before a section navigation finished could use the previous section. Section navigation now shares transition state with the selectors, disabling them while pending. The regression test changes sections and season immediately, without a fixed wait.

```powershell
npm.cmd run db:verify
npm.cmd run competitions:verify
npm.cmd run matches:verify
npm.cmd run check
npm.cmd run format:check
npm.cmd run build
npm.cmd run test:e2e -- --workers=1 --project=desktop
npm.cmd run test:e2e -- --workers=1 --project=tablet
npm.cmd run test:e2e -- --workers=1 --project=mobile
npm.cmd run infra:check
```

## Run and scope

Start the configured database/Redis services as described in README, enable development seeding only for a development database, run `npm.cmd run db:seed`, then `npm.cmd run dev`. Open `/competitions` or `/competition/demo-continental-cup/standings` to inspect mixed formats.

The local PostgreSQL service uses PGlite over the PostgreSQL wire protocol. PostgreSQL 17/Redis CI is configured but has not executed remotely from this workspace. The existing Prisma/pg relation-read deprecation warning is non-failing. Provider integration, hosted-service load testing, indexing/sitemaps, team/player profiles and live synchronization remain later phases.

**Stop after Phase 5. Await “Continue to Phase 6.”**
