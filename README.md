# Shit You Should Know

Quizzes on the basics every adult should know. React + Tailwind + shadcn/ui, no backend, no
accounts — everything lives in `localStorage` on your device.

## Categories

- **Countries** — name every country on an interactive world map. Sudden Death, Free Play, and
  Missed Only modes; pick a region first. Multiple choice, ported from a standalone map-drill app.

## Run it

```sh
npm install
npm run dev
```

## Add a category

Each category lives under `src/categories/<id>/` and is self-contained (its own data, game logic,
and components). Register it in `src/categories/registry.tsx`.

## Countries map data

`src/categories/countries/data/world.json` is generated from Natural Earth data via
`world-atlas`/`d3-geo`/`topojson-client`. Regenerate it (e.g. after editing the quiz set in
`scripts/countries.mjs`) with:

```sh
npm run build:data
```
