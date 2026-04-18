# NHL Franchise History (local-first)

React + TypeScript + Vite app for browsing **historical NHL franchise lineages** from seeded data. Favorites, filters, compare picks, Conn Smythe UI state, theme, and per-team notes persist in **localStorage**. No backend and no live APIs at runtime.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

```bash
npm test
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/types/models.ts` | Core domain types (`Franchise`, `TeamIdentity` + `transitionFromPrior`, `eraColors`, trophy rows, etc.) |
| `src/types/persistence.ts` | Shape of persisted UI state (`AppPersistedStateV1`) |
| `src/data/franchisePlaceholders.ts` | Every franchise row — mostly expandable placeholders |
| `src/data/franchiseSeed.ts` | Rich example rows that **replace** placeholders by matching `id` |
| `src/data/franchises.ts` | Merge: placeholders → seed → cup enrichment → Wikipedia assets |
| `src/data/franchiseCupEnrichment.ts` | Stanley Cup seasons + `isPlaceholder: false` for teams not in deep seed |
| `src/data/franchiseWikiAssets.generated.ts` | **Generated** logos + summaries (run `npm run generate:wiki-assets`) |
| `scripts/fetch-franchise-wiki-assets.mjs` | Pulls English Wikipedia thumbnails & extracts per team |
| `src/data/connSmythe.ts` | Conn Smythe winner seed |
| `src/lib/franchiseStats.ts` | Lifetime totals + `computeIdentityWindowStats` for one branding era |
| `src/lib/franchiseValidation.ts` | `validateFranchise()` — ordering, gaps, lineage id refs, bounds |
| `src/lib/branding.ts` | `resolveFranchiseColors()` merges per-era `eraColors` over franchise defaults |
| `src/lib/franchiseIdentity.ts` | `getCurrentIdentity()`, `hasMultipleIdentities()` |
| `src/lib/localStorage.ts` | Versioned `localStorage` key: `nhl-franchise-history:v1:app-state` |
| `src/features/*` | Page-level UI |
| `src/components/*` | Reusable pieces (timeline, stat blocks, shell) |

## Team logos & Wikipedia overviews

- Each franchise can expose `logoUrl`, `wikiSummary`, and `wikipediaUrl` on the merged `Franchise` object.
- Defaults come from **`franchiseWikiAssets.generated.ts`**, produced by querying the **Wikimedia Foundation** REST API (same images used on English Wikipedia). Team names and logos are **trademarks** of the NHL and its clubs; use at your own risk for public deployment.
- Refresh after adding a new slug: update `WIKI_TITLE_BY_SLUG` in `scripts/fetch-franchise-wiki-assets.mjs`, then run:

```bash
npm run generate:wiki-assets
```

- If a thumbnail URL breaks, re-run the script or swap in a local file under `public/` and set `logoUrl` in data manually.

### Cup list enrichment

`franchiseCupEnrichment.ts` fills **Stanley Cup championship seasons** for active clubs (and defunct rows) that are **not** already fully modeled in `franchiseSeed.ts`. Rows may also set **`playoffAppearances`** and **`stanleyCupFinals`** (see Anaheim Ducks). Deeper year-by-year detail can still be expanded in `franchiseSeed.ts` when you want full fidelity.

## Expanding the dataset

### Franchises

1. **Prefer editing `franchiseSeed.ts`** for teams you want fully modeled. Any object with the same `id` as a placeholder **overwrites** the placeholder during the merge in `franchises.ts`.
2. For **new** franchises, add a full `Franchise` object to `franchisePlaceholders.ts` (or add to seed) with a unique `id` and `slug` (slug is used in URLs: `/franchises/:slug`).
3. Fill arrays incrementally: `playoffAppearances`, `stanleyCupFinals`, `stanleyCupChampionships`, `divisionTitles`. Leave `isPlaceholder: true` and a `placeholderNote` until you are confident in the history.
4. **`isActive`:** Set to `true` for current NHL clubs and `false` for defunct lineages. Home dashboard counts (active vs inactive) and “longest active Cup drought” use this flag.

### Conn Smythe (`src/data/connSmythe.ts`)

- Each winner needs a stable string **`id`** (used for UI selection persisted in `localStorage`).
- Set **`franchiseId`** to the same string as the franchise row’s `id` whenever the winner’s team maps to one continuous franchise. That drives:
  - Franchise detail “Conn Smythe awards (seed)” totals and “most recent”
  - The Conn Smythe page franchise filter
  - Direct links from winner detail cards to `/franchises/:slug`
- If `franchiseId` is missing, the UI may still **resolve** a franchise from `teamName` via `src/lib/connSmytheFranchise.ts` (fuzzy); prefer explicit `franchiseId` for accuracy.
- **`teamName`** should match common hockey-reference style labels for search and fallback resolution.

### Relocations and renames

Keep **one franchise row** per continuous entity. Model city/name changes with `lineage.identities[]`. Use `predecessorFranchiseIds` / `successorFranchiseId` only when you need explicit graph edges between separate rows (e.g. original Ottawa Senators → St. Louis Eagles).

### League dashboard reference season

Home-page Cup drought uses **`DASHBOARD_REFERENCE_SEASON_START_YEAR`** (start year of the reference season, e.g. `2025` for 2025–26) plus **`DASHBOARD_REFERENCE_SEASON_LABEL`** for display. Leaderboards (**most Cups**, **longest active drought**) only include franchises with **`isPlaceholder: false`**, so empty placeholder trophy arrays do not fake a century-long drought. Bump the constants in `src/lib/leagueDashboard.ts` when you roll the app forward to a new season.

## Persistence

### Full app state (`localStorage`)

Everything below is stored as **one JSON object** under:

`nhl-franchise-history:v1:app-state`

(see `STORAGE_ROOT_KEY`, `STORAGE_VERSION`, and `storageKey('app-state')` in `src/lib/localStorage.ts`).

Shape: **`AppPersistedStateV1`** in `src/types/persistence.ts`:

| Field | Type | Purpose |
|-------|------|---------|
| `version` | `1` | Schema version inside the blob (not the same as export `userLibraryVersion`). |
| `favorites` | `string[]` | Franchise `id` values marked as favorites. |
| `recentlyViewedSlugs` | `string[]` | Recent `/franchises/:slug` visits (most recent first, capped at 20). |
| `indexFilters` | object | Franchise index search + filters (`search`, `status`, `conference`, `division`, `era`). |
| `indexSort` | object | Sort key + direction for the index. |
| `lastViewedSlug` | `string` (optional) | Last opened franchise slug. |
| `theme` | `'system' \| 'light' \| 'dark'` | UI theme. |
| `teamNotes` | `Record<franchiseId, string>` | Free-form notes per franchise. |
| `compareA`, `compareB` | `string` (optional) | Franchise ids selected on the compare page. |
| `connSmythe` | object | Conn Smythe UI: `search`, `franchiseId` filter (`'all'` or franchise id), `selectedWinnerId` (winner row id). |

Bump `STORAGE_VERSION` and extend `migrateRaw()` in `src/lib/localStorage.ts` if you make breaking changes to this shape.

### Portable backup (favorites + notes only)

The **About** page can download or import a smaller JSON file that is **not** the full `localStorage` blob. It uses `userLibraryVersion: 1` and is defined in `src/lib/userLibraryExport.ts`:

```json
{
  "userLibraryVersion": 1,
  "exportedAt": "2026-04-17T12:00:00.000Z",
  "favorites": ["toronto-maple-leafs"],
  "teamNotes": {
    "toronto-maple-leafs": "My note"
  }
}
```

- **Merge import:** unions `favorites`; `teamNotes` keys from the file overwrite existing keys for those franchise ids.
- **Replace import:** `favorites` and `teamNotes` become exactly what is in the file (other persisted fields are untouched).

## Branding note (Utah)

The seed uses **Utah Mammoth** as a representative name for the post–Arizona NHL club; adjust `lineage.identities` and display names when your dataset targets a specific season or official branding.

## Tech stack

- React 18, TypeScript, Vite 5
- React Router 6
- Vitest for unit tests
