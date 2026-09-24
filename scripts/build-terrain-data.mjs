// Projects the Terrain feature list (scripts/terrain-features.mjs) into the same coordinate space as
// the shared world basemap (src/data/world.json), so both line up on the map: each feature's focus
// frame from its hand-authored box, and its outline from Natural Earth's physical data (downloaded).
// Run: npm run build:terrain-data
import { writeFileSync } from 'node:fs';
import { geoMercator, geoPath } from 'd3-geo';
import { FEATURES } from './terrain-features.mjs';

// Same projection setup as build-data.mjs (must match, so lon/lat land in the same place on screen).
const W = 2000;
const LAT_TOP = 80, LAT_BOT = -57;
const projection = geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
const round = (n) => Math.round(n * 10) / 10;
projection.clipExtent([[0, round(projection([0, LAT_TOP])[1])], [W, round(projection([0, LAT_BOT])[1])]]);
const path = geoPath(projection).digits(1);
const lonX = (lon) => W / 2 + (lon * W) / 360; // unwrapped: lon may exceed 180 (e.g. the Pacific)
const latY = (lat) => projection([0, lat])[1];

// Where each feature's outline can come from, in order of preference: the 50m sets first, then 10m
// for the few deserts only it has (Simpson, Garagum, Taklimakan).
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SOURCES = [
  'ne_50m_geography_marine_polys',
  'ne_50m_lakes',
  'ne_50m_geography_regions_polys',
  'ne_10m_geography_regions_polys',
];
const sources = [];
for (const name of SOURCES) {
  const res = await fetch(`${NE}${name}.geojson`);
  if (!res.ok) throw new Error(`${res.status} ${name}`);
  sources.push((await res.json()).features);
}
const neName = (f) => (f.properties.name ?? f.properties.NAME ?? '').toLowerCase();

// Every feature called `name`, from the first source that has it.
function lookup(name) {
  for (const features of sources) {
    const hits = features.filter((f) => neName(f) === name.toLowerCase());
    if (hits.length) return hits;
  }
  throw new Error(`No Natural Earth shape named "${name}"`);
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const seen = new Set();
const features = FEATURES.map(([name, type, [west, south, east, north], neNames]) => {
  const id = slug(name);
  if (seen.has(id)) throw new Error(`duplicate terrain feature id: ${id}`);
  seen.add(id);

  const x0 = lonX(west);
  const x1 = lonX(east);
  const y0 = latY(north); // north is the smaller y (mercator y grows southward)
  const y1 = latY(south);
  const f = [round(x0), round(y0), round(x1 - x0), round(y1 - y0)];
  // Approximate "size" from the focus frame's own area; it only has to be roughly right.
  const a = Math.round(f[2] * f[3]);

  const d = neNames.flatMap(lookup).map((g) => path(g)).join('');
  return d ? { id, name, type, f, a, d } : { id, name, type, f, a };
});

const json = JSON.stringify(features);
writeFileSync(new URL('../src/categories/terrain/data/features.json', import.meta.url), json);
const outlined = features.filter((t) => t.d).length;
console.log(`features.json ${(json.length / 1024).toFixed(1)} KB — ${features.length} features, ${outlined} with outlines`);
