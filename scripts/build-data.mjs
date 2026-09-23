// Turns Natural Earth (via world-atlas) into pre-projected SVG paths → src/categories/countries/data/world.json
// Run: npm run build:data
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoPath, geoCircle, geoGraticule } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { COUNTRIES } from './countries.mjs';

const W = 2000;
const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const features = feature(topo, topo.objects.countries).features;

// A rectangular, horizontally-periodic map: x = W/2 + lon·W/360, so tiles placed W apart join perfectly
// and the app can wrap the world left-to-right (Fiji, Kiribati and Samoa sit on either side of 180°).
const LAT_TOP = 80, LAT_BOT = -57;
const projection = geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
const round = (n) => Math.round(n * 10) / 10;
const yTop = round(projection([0, LAT_TOP])[1]);
const yBot = round(projection([0, LAT_BOT])[1]);
projection.clipExtent([[0, yTop], [W, yBot]]); // drops the polar caps and Antarctica
const path = geoPath(projection).digits(1);
const lonX = (lon) => W / 2 + (lon * W) / 360; // unwrapped: lon may exceed 180

// ── Tuvalu: nine atolls, each a tiny circle ─────────────────────────────
const TUVALU_ATOLLS = [
  [179.19, -8.52], [178.68, -7.48], [178.35, -8.0], [177.15, -7.24], [176.12, -5.68],
  [177.34, -6.11], [176.32, -6.29], [179.72, -9.38], [178.7, -7.9],
];
const tuvalu = {
  type: 'Feature',
  properties: { name: '__tuvalu' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: TUVALU_ATOLLS.map((c) => geoCircle().center(c).radius(0.22).precision(30)().coordinates),
  },
};

// ── Quiz countries ──────────────────────────────────────────────────────
const byAtlasName = new Map(features.map((f) => [f.properties.name, f]));
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Overseas pieces that would drag the auto-zoom frame across an ocean.
const MAIN_ONLY = new Set(['France', 'United States', 'Netherlands', 'Norway', 'Denmark', 'Spain', 'Portugal', 'Chile', 'Ecuador', 'New Zealand', 'United Kingdom', 'Russia', 'Malaysia']);

// Countries that straddle the antimeridian get an explicit lon/lat frame [[west, south], [east, north]].
const FOCUS_OVERRIDE = {
  Russia: [[27, 41], [190.3, 77]],
  Fiji: [[176.8, -19.3], [182.5, -16]],
  Kiribati: [[172.5, -4], [177.2, 4.6]],
};

const quizFeatureNames = new Set();
const countries = COUNTRIES.map(([name, atlasName, region, aliases = []]) => {
  const f = atlasName ? byAtlasName.get(atlasName) : tuvalu;
  if (!f) throw new Error(`No map feature for ${name} (${atlasName})`);
  if (atlasName) quizFeatureNames.add(atlasName);

  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const parts = polys
    .map((coordinates) => {
      const g = { type: 'Polygon', coordinates };
      const [[x0, y0], [x1, y1]] = path.bounds(g);
      return { x0, y0, x1, y1, area: path.area(g) };
    })
    .filter((p) => Number.isFinite(p.x0));
  const maxArea = Math.max(...parts.map((p) => p.area));
  const total = parts.reduce((s, p) => s + p.area, 0);

  // Focus frame: the main landmass plus any comparably-sized pieces.
  // Micro-nations keep every piece (Maldives, Comoros, Tuvalu are all "pieces").
  const tiny = total < 60;
  const keep = parts.filter((p) => tiny || (MAIN_ONLY.has(name) ? p.area === maxArea : p.area >= maxArea * 0.12));
  let x0 = Math.min(...keep.map((p) => p.x0)), y0 = Math.min(...keep.map((p) => p.y0));
  let x1 = Math.max(...keep.map((p) => p.x1)), y1 = Math.max(...keep.map((p) => p.y1));
  if (FOCUS_OVERRIDE[name]) {
    const [[w, s], [e, n]] = FOCUS_OVERRIDE[name];
    const ys = [s, n].map((lat) => projection([0, lat])[1]);
    x0 = lonX(w); x1 = lonX(e);
    y0 = Math.min(...ys); y1 = Math.max(...ys);
  }

  return {
    id: slug(name),
    name,
    region,
    alt: aliases,
    d: path(f),
    f: [round(x0), round(y0), round(x1 - x0), round(y1 - y0)],
    a: Math.round(total), // projected area — the app draws a locator ring when this is tiny on screen
  };
});

// ── Grey context: every other territory, merged into one path ───────────
const context = features
  .filter((f) => !quizFeatureNames.has(f.properties.name) && f.properties.name !== 'Antarctica')
  .map((f) => path(f))
  .filter(Boolean)
  .join('');

// ── Borders: every shared border + coastline once, as a single line mesh ──
// Land fills carry no outline of their own; otherwise the cut Natural Earth makes along 180° would show
// up as a hairline through Chukotka, Fiji and the Aleutians once the map wraps. Cut segments are dropped here.
const geoms = topo.objects.countries.geometries.filter((g) => g.id !== '010'); // no Antarctica
const collection = { type: 'GeometryCollection', geometries: geoms };
const lines = [...mesh(topo, collection, (a, b) => a !== b).coordinates, ...mesh(topo, collection, (a, b) => a === b).coordinates];
const onSeam = (p) => Math.abs(p[0]) > 179.9999;
const kept = [];
for (const line of lines) {
  let cur = [];
  line.forEach((p, i) => {
    cur.push(p);
    const q = line[i + 1];
    if (q && onSeam(p) && onSeam(q) && Math.sign(p[0]) === Math.sign(q[0])) {
      if (cur.length > 1) kept.push(cur);
      cur = [];
    }
  });
  if (cur.length > 1) kept.push(cur);
}
const borders = path({ type: 'MultiLineString', coordinates: kept });

// ── Ocean + graticule ─────────────────────────────────────────────────────
const ocean = `M0,${yTop}H${W}V${yBot}H0Z`;
const graticule = path(geoGraticule().step([30, 30]).extent([[-180, LAT_BOT], [180, LAT_TOP]])());

const out = { w: W, top: yTop, bottom: yBot, ocean, graticule, context, borders, countries };
const json = JSON.stringify(out);
writeFileSync(new URL('../src/categories/countries/data/world.json', import.meta.url), json);

const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
console.log(`world.json ${kb(json)} — ${countries.length} countries, context ${kb(context)}, borders ${kb(borders)}, world ${W}×${round(yBot - yTop)}`);
const wide = countries.filter((c) => c.f[2] > 400).map((c) => `${c.name} ${c.f[2]}`);
console.log('very wide focus frames:', wide.join(', ') || 'none');
