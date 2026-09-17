# Touchline design system

The initial language is an editorial football match centre: forest green, warm white surfaces, compact score rows, restrained borders, clear status labels and locally bundled Manrope/DM Sans fonts. Main content follows competition and match hierarchy. The layout reduces side content on smaller screens and keeps score checking central.

## Tokens and components

`src/styles/tokens.css` defines semantic colors, typography, spacing, radii and a 44px touch-target token. Tailwind is configured through CSS imports and `@theme inline` in `src/app/globals.css`. Reusable component styles live in `src/styles/components.css`; page layout styles remain in `globals.css`.

| Need                                      | Implementation                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Global navigation                         | `components/layout/site-header.tsx`, reused by the match centre and component reference                |
| Competition icons and team badges         | `components/football/marks.tsx`; illustrative vector/text marks with readable names                    |
| Country flags                             | `components/ui/country-flag.tsx`; small initial SVG set, accessible country-code fallback              |
| Score display                             | `components/ui/score-display.tsx`; paired unknown scores and stable mobile alignment                   |
| Match rows                                | `components/football/match-row.tsx`; labeled open/save controls and keyboard access                    |
| Match, team, player and competition cards | `components/football/cards.tsx`; presentation props, optional navigation/actions                       |
| Statistics cards                          | `StatisticCard` in `cards.tsx`; zero remains zero, unknown values stay unknown                         |
| Standings table                           | `components/football/standings-table.tsx`; captions, scoped headers and contained horizontal scrolling |
| Form/live indicators                      | `components/ui/indicators.tsx`; textual results/status supplement color                                |
| Content tabs                              | `Tabs` in `components/ui/controls.tsx`; arrow/Home/End navigation, roving focus and associated panels  |
| Filter controls                           | `FilterTabs` and `SelectFilter`; pressed-state buttons and native selects                              |
| Search                                    | `SearchField`; labeled search input and clear action                                                   |
| Date navigation                           | `DateNavigation`; day buttons, previous/next and native date picker                                    |
| Skeleton/empty/error states               | `components/ui/states.tsx`; loading status, useful actions, alert semantics                            |
| Global page boundaries                    | `app/(football)/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`                                     |

## Responsive and accessible behavior

- Desktop has full competition navigation and supporting match content. Tablet condenses the layout. Mobile prioritizes dates, fixtures, scores, filtering and saves, with readable team labels and contained overflow.
- Links navigate; buttons act. Controls have labels, visible focus and selected state. Match dialogs manage focus and close with Escape.
- True content tabs use tablist/tab/tabpanel semantics; filter buttons use `aria-pressed` without pretending to own tab panels.
- Dates use native input controls. Time-zone choices are explicit in the match centre. Scores use tabular numbers.
- Text accompanies color for live states, form and errors. Decorative marks are hidden where a nearby team name already provides the accessible label.
- Reduced-motion preferences stop skeleton animation. Empty/loading/error states do not substitute fabricated scores.
- Standings scroll within a labeled, keyboard-focusable region on narrow screens. The whole page must not overflow horizontally.

## Component reference and scope

Run `npm.cmd run dev` and visit `/design-system` to review sample cards, identities, form, scores, a standings table, tabs, filters and states together. All examples are explicitly illustrative. The route returns 404 in production and is absent from product navigation.

This is an initial component foundation. It does not supply real standings, player records, licensed badges/photos, or future entity pages. Extend the same components with normalized DTOs when each data feature is authorized. Verify keyboard behavior, text contrast, viewport overflow and real data edge cases with each extension.

## Phase 4 match center

`match-center-list.tsx`, `match-center-controls.tsx`, `match-center-shared.tsx` and `match-center-detail.tsx` extend the same tokens with country/competition match groups, date/filter navigation, a scoreboard, team-aligned event timeline, formation pitches, accessible player lists and statistic comparisons. `match-center.css` contains their responsive styles. `DataBadge` displays an available HTTPS asset in the browser and falls back to the existing illustrative mark when absent or broken.

Mobile score rows align teams vertically; timeline entries use a single chronological column. Detail tabs preserve keyboard arrow/Home/End navigation. Formation graphics supplement a full textual lineup. Unknown values and disallowed events remain labelled. Dates use UTC days and displayed times declare their time zone.

## Phase 5 competition pages

`competition-directory.tsx`, `competition-controls.tsx` and `competition-view.tsx` reuse the header, badges, form indicators, match rows and empty/error states. `competition-center.css` adds a green competition identity, season/stage/group selectors, linked section navigation, eleven-column standings, knockout rounds, player leaderboards and scoped team metrics.

Standings have captions and scoped row/column headers. A labelled focusable scroll region contains wide tables; team names stay visible on phones, with a visible scroll hint. Form remains textual and ordered oldest-to-newest. Tied positions, unknown values and points adjustments are explicit. Knockout legs link to match pages; future team/player pages are not linked prematurely. Sections use links with `aria-current`; native selects and pending status messages handle transitions. Selectors are disabled while a section navigation is pending, preventing season changes based on stale section data.
