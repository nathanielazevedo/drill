# Shit You Should Know

Quizzes on the basics every adult should know. React + Tailwind + shadcn/ui, no backend, no
accounts — everything lives in `localStorage` on your device.

## Categories

The map categories play on the same interactive world map (pan/zoom, fly-to, multiple choice) via a shared
drill engine at `src/lib/drill/` and `src/components/drill/`.

- **Countries** — name every country. Sudden Death, Free Play, and Missed Only modes; pick a
  region first. Ported from a standalone map-drill app.
- **Terrain** — oceans, lakes, mountain ranges, and deserts. Same modes, filtered by type instead
  of region. These don't have official boundaries, so the map shows a locator ring over the right
  area rather than a precise outline.
- **US States** — all 50, filtered by Census region, with capital, largest city, statehood and
  nickname in the facts. DC is on the map but not quizzed.
- **Chinese Provinces** — the 31 mainland provincial-level divisions plus Hong Kong and Macau,
  grouped into China's six traditional regions. Its own basemap, with Chinese names, pinyin and
  pronunciation in the facts.
- **US Presidents** — all 45 in order, from their portraits (no map).

## Run it

```sh
npm install
npm run dev
```

## Add a category

A category is a data set (`DrillTarget[]`: id, name, a region/type for filtering, and a focus
frame in the shared basemap's projection) plus a thin component wiring it into `useDrillGame`,
`GroupHome`, and `DrillScreen`. See `src/categories/countries/CountriesCategory.tsx` or
`src/categories/terrain/TerrainCategory.tsx` for the pattern. Register the result in
`src/categories/registry.tsx` (lazy-loaded, so a category's data doesn't weigh down the home
screen for anyone who hasn't opened it).

## Map data

- `src/data/world.json` — the shared physical basemap (ocean, land, borders), generated from
  Natural Earth via `world-atlas`/`d3-geo`/`topojson-client`. Regenerate after editing the
  Countries quiz set in `scripts/countries.mjs` with `npm run build:data`.
- `src/categories/terrain/data/features.json` — Terrain's hand-authored bounding boxes. Edit
  `scripts/terrain-features.mjs` and regenerate with `npm run build:terrain-data`.
- `src/categories/china/data/china.json` and `src/categories/us-states/data/us.json` — the China and
  US basemaps: Natural Earth 50m admin-1 provinces/states (downloaded by
  `scripts/build-admin1-data.mjs`) on the same projection as the world map. Edit
  `scripts/china-provinces.mjs` or `scripts/us-states.mjs` and regenerate with
  `npm run build:china-data` / `npm run build:us-data`.
