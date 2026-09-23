// Projects the hand-authored Terrain feature list (scripts/terrain-features.mjs) into the same
// coordinate space as the shared world basemap (src/data/world.json), so both line up on the map.
// Run: npm run build:terrain-data
import { writeFileSync } from 'node:fs';
import { geoMercator } from 'd3-geo';
import { FEATURES } from './terrain-features.mjs';

// Same projection setup as build-data.mjs (must match, so lon/lat land in the same place on screen).
const W = 2000;
const projection = geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
const round = (n) => Math.round(n * 10) / 10;
const lonX = (lon) => W / 2 + (lon * W) / 360; // unwrapped: lon may exceed 180 (e.g. the Pacific)
const latY = (lat) => projection([0, lat])[1];

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const seen = new Set();
const features = FEATURES.map(([name, type, [west, south, east, north]]) => {
  const id = slug(name);
  if (seen.has(id)) throw new Error(`duplicate terrain feature id: ${id}`);
  seen.add(id);

  const x0 = lonX(west);
  const x1 = lonX(east);
  const y0 = latY(north); // north is the smaller y (mercator y grows southward)
  const y1 = latY(south);
  const f = [round(x0), round(y0), round(x1 - x0), round(y1 - y0)];
  // No real polygon to measure, so approximate "size" from the focus frame's own area —
  // it only has to be roughly right, to decide whether the locator ring should show.
  const a = Math.round(f[2] * f[3]);

  return { id, name, type, f, a };
});

const json = JSON.stringify(features);
writeFileSync(new URL('../src/categories/terrain/data/features.json', import.meta.url), json);
console.log(`features.json ${(json.length / 1024).toFixed(1)} KB — ${features.length} features`);
