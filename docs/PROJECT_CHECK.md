# Project check and integration repairs

The user requested a check of the current workspace while Phase 5 was being completed. Additional provider, search, team, account and deployment code was present by then. Those additions were preserved; this check does not mark every later product phase complete.

## Repairs

- Competition section/season navigation shares transition state, preventing a rapid season change from restoring the previous section.
- Rebuilt a corrupted generated Next.js route validator after stopping the development server. Avoid running type generation concurrently with a restarting development server.
- Production browser tests now supply isolated test configuration and an explicit demo read mode. The normal home page continues to use provider-synchronized SQL data by default. Cache keys separate those sources; `.env.local` is unchanged.
- Team search links resolve stored UUIDs to canonical team slugs, including teams absent from the home snapshot. Fixture links use the match center's real public IDs.
- Search rejects duplicate/oversized queries before string operations, and its pages are non-indexable. Historical competition metadata retains the selected season.
- The public live endpoint reads bounded, normalized SQL/Redis records. Browser requests no longer call the provider API directly.
- Cookie-authenticated account mutations and logout require a configured same-origin request. Invalid favorite IDs return 400, and duplicate favorites are normalized before persistence.
- Redis request counters increment atomically with an expiry, and connections close on failures. Verified 20 concurrent increments against the configured Redis service.
- HTTPS badge images are allowed by the image policy. Provider error details are sanitized; API response construction preserves rate-limit headers.
- Applied the configured formatter to the newer files.

## Validation

Final results are recorded after the production browser and local runtime checks complete.

The production build test server uses test credentials on port 3100. The normal local app runs on port 3000. Tests do not invoke provider synchronization, send notifications, deploy, or modify local secrets.

## Current limits

Competition and match-center pages still use labelled database samples. Provider modules exist, but a full real-provider ingestion/coverage run is not part of this repair. The home page can correctly show no matches when no provider data is synchronized. Basic team/search/account routes are present; complete team/player profiles and all later-phase acceptance criteria remain separate work.

Production startup deliberately requires HTTPS origin, trusted-proxy configuration and private admin/cron credentials. Use `npm.cmd run dev` locally; see `docs/DEPLOYMENT.md` before hosting the production build. The account implementation has targeted regression coverage here, not a comprehensive security audit.
