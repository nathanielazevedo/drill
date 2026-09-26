# Shit You Should Know

Quizzes on the basics every adult should know. React + Tailwind + shadcn/ui, no backend, no
accounts — everything lives in `localStorage` on your device.

## Categories

The map categories play on the same interactive world map (pan/zoom, fly-to, multiple choice) via a shared
drill engine at `src/lib/drill/` and `src/components/drill/`. Every category plays the same way:
one miss ends the run, and your best streak is kept per region.

- **Countries** — name every country; pick a region first. Ported from a standalone map-drill app.
- **Terrain** — oceans, lakes, mountain ranges, and deserts, filtered by type instead
  of region. Each question shades the feature's shape from Natural Earth's physical data (the
  Mojave, which it doesn't have, gets just the locator ring).
- **US States** — all 50, filtered by Census region, with capital, largest city, statehood and
  nickname in the facts. DC is on the map but not quizzed.
- **Chinese Provinces** — the 31 mainland provincial-level divisions plus Hong Kong and Macau,
  grouped into China's six traditional regions. Its own basemap, with Chinese names, pinyin and
  pronunciation in the facts.
- **US Presidents** — all 45 in order, from their portraits (no map).
- **Mandarin** — 100 of the most common words, shown in pinyin only (no characters); pick the
  English meaning. Grouped by word type, with an example sentence in the facts.
- **Mandarin Map** — 80 one-syllable building blocks (rén, dà, diàn…) as territories on a made-up
  map, one continent per theme, and 92 two-block words (dàrén, diànnǎo…) asked by lighting up both
  blocks with a bridge between them. Blocks that build words together are drawn near each other.
  The map is generated from `data/blocks.json` by `npm run build:mandarin-map`.
- **Mandarin Sentences** — the 100 most useful everyday sentences as flashcards you mark yourself:
  see the English, say it out loud, reveal the pinyin (read aloud by the device's Mandarin voice,
  where it has one), then Got it or Missed. Keys: Space reveals, → Got it, ← Missed.

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
- `src/categories/terrain/data/features.json` — Terrain's features: a hand-authored box to fly to,
  plus an outline from Natural Earth (downloaded by the script). Edit `scripts/terrain-features.mjs`
  and regenerate with `npm run build:terrain-data`.
- The world map also has a lakes layer from Natural Earth, since world-atlas counts lakes as land.
- `src/categories/china/data/china.json` and `src/categories/us-states/data/us.json` — the China and
  US basemaps: Natural Earth 50m admin-1 provinces/states (downloaded by
  `scripts/build-admin1-data.mjs`) on the same projection as the world map. Edit
  `scripts/china-provinces.mjs` or `scripts/us-states.mjs` and regenerate with
  `npm run build:china-data` / `npm run build:us-data`.
