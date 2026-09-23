# Shit You Should Know

Quizzes on the basics every adult should know. React + Tailwind + shadcn/ui, no backend, no
accounts — everything lives in `localStorage` on your device.

## Categories

Both play on the same interactive world map (pan/zoom, fly-to, multiple choice) via a shared
drill engine at `src/lib/drill/` and `src/components/drill/`.

- **Countries** — name every country. Sudden Death, Free Play, and Missed Only modes; pick a
  region first. Ported from a standalone map-drill app.
- **Terrain** — oceans, lakes, mountain ranges, and deserts. Same modes, filtered by type instead
  of region. These don't have official boundaries, so the map shows a locator ring over the right
  area rather than a precise outline.

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
