# Public URL design

Implemented routes include `/`, `/competitions`, competition overview/sections/historical seasons, `/matches`, `/matches/[date]`, `/match/[match]`, both match APIs, both competition APIs and health endpoints. `/design-system` remains development-only. Team, player, country and global search URLs remain planned.

| Resource               | Planned canonical route                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Home                   | `/`                                                                                            |
| Match listing and date | `/matches`, `/matches/2026-09-15`                                                              |
| Match                  | `/match/real-madrid-vs-barcelona-123456`                                                       |
| Competitions           | `/competitions`                                                                                |
| Competition            | `/competition/premier-league`                                                                  |
| Competition sections   | `/competition/premier-league/standings`, `/matches`, `/stats` appended to the competition base |
| Historical season      | `/competition/premier-league/season/2026-27` with the same section suffixes                    |
| Team directory         | `/teams`                                                                                       |
| Team                   | `/team/real-madrid` with `/matches`, `/squad`, `/stats` sections                               |
| Player                 | `/player/jude-bellingham` with `/stats` section                                                |
| Country/association    | `/countries/england`, `/countries/spain`                                                       |
| Search                 | `/search?q=real+madrid`                                                                        |

## Phase ownership

- **Phase 4 (implemented):** `/matches`, dated match listings, and `/match/[match]`. The dynamic match segment follows the descriptive-slug plus stable-public-ID design above. Preserve selected date, country, competition and status filters in shareable navigation state.
- **Phase 5 (implemented):** competition overview, standings, matches and stats sections, including `/season/[season]` paths. Fixtures/results use `view=fixtures|results` within matches; top scorers/top assists appear in stats. `stage` and `group` query parameters use scoped slugs; invalid season/stage/group combinations return true 404s. The base selects an active season, otherwise the latest started or earliest upcoming season. Section links preserve the explicit season and stage/group. Directory `q` searches competition/country/region with `kind=all|league|cup|international` and `page` pagination.
- **Phase 6:** team overview at `/team/[team]`, plus `/matches`, `/squad` and `/stats` sections. Competition and season selection must preserve the team identity and the selected section.
- **Phase 7:** player profiles at `/player/[player]` and the `/stats` section, with explicit season/team context for statistics and career history.
- **Phase 8:** `/search?q=...`, with grouped team/player/competition/match results, keyboard navigation and mobile search. Search remains non-indexable.
- **Phase 3:** its specification has not been supplied. No routing or provider implementation is assigned to it yet.

## Resolution and SEO rules for the page phase

- Persist lowercase, hyphenated slugs with uniqueness per entity table. Generate them once, including deliberate transliteration. On collisions append country, birth year where appropriate, or a short internal public identifier. Do not recalculate slugs on every provider update.
- Match resolution uses a unique internal numeric public ID, independent of the provider. The descriptive home/away prefix is cosmetic. Redirect a valid ID with an outdated prefix to its canonical URL. UUIDs remain database keys.
- Add slug-alias records when a published slug changes. Resolve aliases with permanent redirects; preserve inbound links. Never redirect unknown entities to unrelated pages.
- Historical seasons get stable explicit paths. The unqualified competition page selects the current season, linking to history. Each historical page is self-canonical; do not canonicalize all history to the current season.
- Date paths use strict valid `YYYY-MM-DD`. Store kickoff in UTC. The future match-list date denotes a UTC calendar day for a stable shared URL; viewer-local times are a display choice and must be labeled. The current preview's time-zone/date filtering is separate and must be reconciled explicitly when these routes launch.
- Unknown entities/dates return a useful 404. Valid dates with no fixtures show an empty state. Fetch pages server-side from our read service; no browser-side provider calls.
- Use one canonical URL per resource, consistent slash policy, server-rendered titles/descriptions and breadcrumbs. Add sitemaps only for real, indexable licensed content. Search and arbitrary filter combinations should not create unlimited indexable pages.
- All current preview pages are `noindex`. Public canonical origins and indexing are configured at deployment, never guessed from request headers. Provider identifiers and credentials are absent from public URLs. Phase 4 uses internal public match IDs, returns true 404s for invalid dates/unknown matches, and redirects outdated descriptive match prefixes with HTTP 308. `/matches` redirects to the current UTC date. Calendar dates from 1800 through 2200 are supported.

References: [Google URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
