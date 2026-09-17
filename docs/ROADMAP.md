# Phased delivery

Phases 1, 2, 4 and 5 are delivered. The workspace also contains an API-Football adapter, synchronization worker, basic team/search routes and accounts. The latest project check preserves those additions without marking every later phase complete. Match and competition pages still use labelled development records; the home page uses synchronized provider records unless demo mode is explicitly selected. See [project check](PROJECT_CHECK.md).

## Phase 1 — Project foundation

Next.js, React, TypeScript, Tailwind, folder architecture, linting/formatting, private environment handling, PostgreSQL, Prisma, Redis configuration, initial reusable design system, global navigation, desktop/mobile layouts, loading/error handling, and health endpoints.

Acceptance: run the app, lint and type checks; verify real database and Redis connections; fix errors. The eight-table foundation migration and explicit demo repository support this phase. See [verification results](PHASE_1_VERIFICATION.md) for current status.

## Phase 2 — Database (complete)

Build the complete core Prisma schema for countries, competitions, seasons, teams, players, managers, venues, matches, match events, lineups, lineup players, standings, team statistics and player statistics.

Implement relations, foreign keys, indexes, unique constraints and enums. Preserve stable internal IDs and separate provider references. Follow the [relational blueprint](DATABASE.md).

Match status must support at least `SCHEDULED`, `LIVE`, `HALFTIME`, `FINISHED`, `POSTPONED`, `CANCELLED` and `ABANDONED`. Migrate the existing status representation deliberately, preserving records and the normalized frontend boundary.

Create reviewed migrations and repeatable development seed data so UI development can use persisted illustrative records without a live provider. Seed only an explicitly selected development database, with stable sample identities and no automatic database wipe.

Verify fresh migrations, compatibility with the Phase 1 foundation, repeated seed execution, relational reads, creates/updates/deletes, invalid foreign keys, uniqueness, transaction rollback and integrity rules. Cover unknown values, historical seasons and every supported match status. Finish with lint, TypeScript and application checks; fix failures, summarize the result, and **stop after Phase 2**.

Delivered: 25 models, a preserving upgrade migration, deterministic synthetic seed data, SQL integrity tests, and real Prisma relational/CRUD/rollback verification. See [Phase 2 verification](PHASE_2_VERIFICATION.md).

## Phase 3 — API-Football provider integration (in progress)

API-Football is the selected initial provider. Credentials remain server-only in
`API_FOOTBALL_KEY`; optional `API_FOOTBALL_LEAGUES` limits synchronization scope.

Delivered:

- Validated provider-neutral API-Football adapter for competitions, seasons,
  fixtures, live fixtures and standings.
- Request timeout, schema validation, provider error mapping, rate-limit
  handling and bounded retries.
- Idempotent synchronization for countries, competitions, seasons, teams,
  season participation, matches and standings.
- Protected `/api/cron/sync` integration and structured synchronization logs.

Not yet covered by this adapter: player profiles, squads, lineups, events and
match statistics. Those capabilities remain explicitly unsupported rather than
being represented with invented data.

## Phase 4 — Match center (complete)

### Match browsing: `/matches`

- Browse by date with **Yesterday**, **Today**, **Tomorrow** and a calendar picker. Preserve the agreed `/matches/YYYY-MM-DD` date URL design.
- Group matches by **country, then competition**. Competitions without a country appear in an explicit international grouping. Country filtering refers to the competition's country/association, not the nationality of either team.
- Each match shows team badges, home and away names, score, kickoff time, status and live minute when available. Unknown scores or kickoff times stay unknown.
- Provide **All**, **Live**, **Upcoming** and **Finished** filters, plus competition and country filters. Live includes ongoing matches at halftime; upcoming selects scheduled fixtures; finished selects completed matches. Postponed, cancelled and abandoned matches retain their own labels in All.
- Keep date shortcuts, calendar selection, date bounds and displayed time-zone labels consistent. Maintain filter state through navigation, provide a clear reset action, and handle combinations with no matches.

### Match detail: `/match/[match]`

- Resolve the agreed descriptive slug plus stable internal public match ID.
- Show score, status, competition, venue, kickoff time and both team badges.
- Create an attractive, mobile-friendly event timeline with goals, known assists, cards and substitutions. Use team alignment, event icons and clear minute labels, including stoppage time. Provide a chronological text reading order for keyboard and screen-reader users.
- Distinguish assist, incoming-player and outgoing-player roles. Preserve period/sequence and corrected or disallowed event states; missing event coverage must not be mistaken for a match with no events.
- Show lineups, formation and match statistics when available, with clear provisional/confirmed lineup labels and unavailable states.
- Include head-to-head information when available. Use prior completed meetings between the same internal team IDs in either home/away orientation; show the available coverage rather than assuming a complete all-time history.

Use the internal read service and normalized DTOs. Development seeds remain explicitly labeled. Actual live refresh must respect the configured provider's capabilities, freshness and quotas; it must not invent elapsed minutes or results.

### Phase 4 acceptance

Verify date navigation and calendar boundaries, timezone/day rollover, country/competition grouping, combined filters, empty states, stable match links and 404s. Exercise scheduled, live, halftime, finished, postponed, cancelled and abandoned fixtures. Verify timeline ordering, stoppage time, assists, both substitution participants, event corrections, unavailable lineups/stats and head-to-head coverage. Check desktop/tablet/mobile layouts, focus order, accessibility, lint, TypeScript and production build. Fix failures and **stop after Phase 4**.

Delivered: UTC date browsing, combined filters, PostgreSQL/Redis read service, normalized list/detail APIs, canonical match links, event timelines, lineups/formations, statistics and available head-to-head. Data remains explicitly synthetic until provider integration. See [Phase 4 verification](PHASE_4_VERIFICATION.md).

## Phase 5 — Competitions (complete)

Build competition pages using the agreed `/competition/[competition]` overview and standings/matches/stats sections, with season selection and explicit historical-season links.

Include **overview, standings, fixtures, results, statistics, top scorers, top assists and form**. Keep every view scoped to its selected competition, season and stage/group where applicable. Fixtures and results belong to the matches section; scorer and assist leaderboards belong to statistics.

Standings columns, in order:

1. Position
2. Team
3. Played
4. Won
5. Drawn
6. Lost
7. Goals for
8. Goals against
9. Goal difference
10. Points
11. Form

Support each competition structure:

- **Leagues:** the appropriate season/stage table, authoritative ordering, points deductions and labeled recent form.
- **Groups:** separate named tables with stable group identity; preserve the correct season and stage context.
- **Knockout competitions:** rounds, ties, fixtures/results and progression, including two-leg aggregates and penalties where applicable. Use a responsive bracket or round-based presentation; a league table is not the representation of a knockout stage.
- **Mixed formats:** switch between league/group and knockout stages without combining their standings or statistics accidentally.

Use defined form ordering and competition/season scope. Keep missing metrics distinct from zero. Preserve provider tie-break ordering, explain the scope of available leaderboard data, and avoid double-counting player records across club spells or duplicate observations.

### Phase 5 acceptance

Verify all sections, the eleven standings columns, historical-season switching, league/group/knockout and mixed-stage fixtures, points deductions, tied ranks, aggregate/shootout outcomes and progression. Check scorer/assist rankings, form scope/order, partial coverage, empty/error/loading states and accessible responsive tables/brackets. Run relevant database/read-service checks, browser tests, lint, TypeScript and production build. Fix failures and **stop after Phase 5**.

Delivered: SQL directory, season/stage/group navigation, full standings, fixtures/results, knockout rounds and scoped statistics. See [Phase 5 verification](PHASE_5_VERIFICATION.md).

## Phase 6 — Team pages (specified; complete scope pending)

A basic team identity/fixture page exists and its canonical search/match links were repaired during the project check. The full scope below remains pending.

Build `/team/[team]` with **Overview**, **Matches**, **Squad** and **Stats** navigation at the agreed `/matches`, `/squad` and `/stats` suffixes.

Include team identity, badge, country, competition, manager, venue, current position, recent form, upcoming match, recent matches, fixtures, squad and statistics. Support clubs and national teams. Scope competition, position, form and statistics to an explicit season/competition; a team can participate in several competitions. Use dated player registrations and manager assignments to preserve history. Unknown badges, venue details or unavailable statistics need useful fallbacks, without inventing data.

Read through the internal server service and normalized DTOs. Any development database samples must remain visibly labelled. Link only to routes that are implemented; later match, competition and player pages retain their own phase boundaries.

### Phase 6 acceptance

Verify team resolution and 404s, all four sections, competition/season scope, club and national-team records, dated squad/manager membership, next/recent fixture ordering and empty/partial data. Check responsive layouts, keyboard navigation, accessible tables, lint, TypeScript, database queries and production browser behavior. Fix failures and **stop after Phase 6**.

## Phase 7 — Player pages (specified, not started)

Build `/player/[player]` and the agreed stats section. Show photo, name, team, nationality, position, age and shirt number. Age is derived from a known birth date using the displayed reference date; unknown dates remain unknown. Team/shirt number belong to the selected dated registration, including separate club/national-team appearances.

Season statistics include **appearances, starts, minutes, goals, assists and cards**. Show advanced statistics only when available from the provider. Include career/season history when supported, with explicit coverage and separate team spells. Avoid combining season aggregates, match observations or different competition scopes into duplicate totals.

### Phase 7 acceptance

Verify profile resolution, 404s, identity/portrait fallbacks, age boundaries, registration/shirt selection, season switching and the six required statistics. Verify unknown versus zero values, optional advanced metrics, available career history and competition/team scope. Check mobile/desktop presentation, accessibility, lint, TypeScript, database reads and production browser behavior. Fix failures and **stop after Phase 7**.

## Phase 8 — Global search (specified, not started)

Build fast global search at `/search?q=...` for **teams, players, competitions and matches**, with separate labelled result groups. A query such as “Madrid” can show Real Madrid and Atlético Madrid under Teams and Real Madrid vs Barcelona under Matches, using actual stored identities and available data.

Provide keyboard navigation, visible focus, accessible result announcements and a usable mobile search interface. Preserve the query in the URL, debounce interactive requests, cancel obsolete requests, and limit/paginate result groups. Search the internal data layer; browser queries must not fan out to the provider. Prepare appropriate SQL search indexes based on the supported language and matching behavior.

### Phase 8 acceptance

Verify grouped results, case/diacritic handling, duplicate names, empty/short queries, no-results and error states, bounded queries, stale-response cancellation, keyboard navigation, Escape behavior, mobile layout, valid entity links and query persistence. Test data access and measured search latency, accessibility, lint, TypeScript and production build. Fix failures and **stop after Phase 8**.

## Phase 9 — Live system (specified, not started)

Implement centralized updating: **provider → live synchronization worker → PostgreSQL/Redis → internal application API → users**. Visitors must not each trigger provider requests.

Schedule active-match synchronization at an interval justified by the selected provider's limits, competition coverage and available quota. Cache normalized reads, commit database changes before cache invalidation, and reduce polling automatically when no matches are live. Share work across instances with a coordination mechanism so visitor count and worker replicas do not multiply upstream calls. Respect provider rate-limit responses, use bounded retries and preserve observation/freshness metadata.

Client refresh or push delivery reads the internal application layer. Stop unnecessary background browser work when pages are hidden or disconnected, show stale/unavailable states honestly, and do not infer a live minute or final score from elapsed wall-clock time. Provider credentials stay server-side; scheduled worker triggers must be authenticated.

### Phase 9 acceptance

Verify active/idle scheduling, return from idle before upcoming fixtures, provider quota bounds, rate limiting/backoff, idempotent updates, concurrent-worker coordination, stale observations and recovery after interruption. Confirm that increasing connected visitors does not increase upstream API calls. Exercise halftime, extra time, penalties, postponed/abandoned fixtures and transitions to finished, with cache/freshness checks and load measurements. Fix failures and **stop after Phase 9**.

## Remaining work — phase assignment to be confirmed

- Licensed provider selection, adapter implementation and ingestion into the existing SQL read/cache boundary. Coordinate live synchronization with Phase 9.
- Secure authentication, CSRF-protected mutations and cross-device follows.
- Production hosting, managed services, monitoring, backups, recovery and performance verification.

Provider selection and API credentials are not prerequisites for Phase 2's database and seed work. Before real-data integration, confirm coverage, quotas, historical depth and storage/display rights. Store credentials only in local or deployment environment variables.

## Phase 10 — Provider-backed statistics and verified history

Delivered:

- Added provider leaderboard capability for API-Football goals, assists and card totals.
- Added `/api/v1/statistics` with rate limiting, competition/season mapping and explicit unavailable states for unsupported metrics.
- Removed hardcoded leaderboard values, fake comparison percentages and fake form-table rows from the statistics centre.
- Added `/api/v1/history`, which derives previous champions from provider seasons and authoritative standings, retaining the provider as the verification source.
- Discovery now renders previous champions only when synchronized provider history is available; other historical views remain unavailable instead of inventing records.

Not yet covered: provider-backed player profiles, squads, full player statistics, team/player comparisons, and historical trophy/record datasets. These remain explicitly unavailable until a verified source and storage model are configured.

## Steps 11–12 — Structured data and monitoring

Delivered:

- Added escaped JSON-LD rendering for match `SportsEvent`, competition `SportsOrganization`, and team `SportsTeam` pages.
- Structured data uses the same normalized page entities as the visible UI and omits unavailable venue values.
- Added an optional HTTPS-only `ERROR_TRACKING_WEBHOOK_URL` sink for sanitized server error events.
- Statistics and historical API failures now emit structured error metadata containing operation, route, error type, bounded message, and optional request ID; credentials, SQL, and provider payloads are never sent.
- Monitoring delivery failures are logged without masking the original application response.

Deployment requirement: configure `ERROR_TRACKING_WEBHOOK_URL` to a managed monitoring/error-tracking collector and continue running the existing external health monitor. The application intentionally does not claim external monitoring is active when the sink is unconfigured.

## Steps 13–14 — Scheduled synchronization and recoverable backups

Delivered:

- Added bounded three-attempt catalog and live synchronization runners with
  one- and two-second exponential backoff and sanitized retry logs.
- Updated systemd synchronization services to use the retry runners while
  preserving authenticated cron endpoints and existing timer frequencies.
- Added `db:backup:restore:verify`, which restores the newest custom-format
  PostgreSQL dump into the explicitly configured `BACKUP_RESTORE_DATABASE_URL`
  target using `pg_restore --clean --if-exists --exit-on-error`.
- Backup scheduling now performs both archive readability verification and
  isolated restore verification. The restore target must never be production.

## Steps 15–16 — Performance and administration

Delivered:

- Added cache hit, miss, write and Redis-unavailable counters for operational inspection.
- Added a protected `/admin/operations` endpoint exposing provider configuration state,
  synchronized record counts, infrastructure flags and cache metrics.
- Added protected manual catalog and live synchronization actions in the admin control room.
- Added `performance:check`, a repeatable smoke benchmark for the homepage, match centre,
  statistics page and readiness endpoint. It fails when a request returns 5xx or exceeds
  two seconds.
- Admin access remains protected by the existing server-side Basic Authentication proxy;
  operational mutations also enforce same-origin requests.
