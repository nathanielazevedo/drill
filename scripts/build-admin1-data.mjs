// Turns one country's Natural Earth admin-1 divisions (provinces, states) into pre-projected SVG paths for its
// category. Same projection and shape as src/data/world.json, so the shared map engine draws it unchanged;
// everything outside the country is grey context.
// Run: npm run build:china-data / npm run build:us-data (downloads the ~2MB Natural Earth file each time)
import { readFileSync, writeFileSync } from 'node:fs';
import { geoBounds, geoMercator, geoPath, geoGraticule } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { PROVINCES } from './china-provinces.mjs';
import { STATES } from './us-states.mjs';

const MAPS = {
  china: {
    adm0: 'CHN',
    targets: PROVINCES,
    // world-atlas countries the quiz shapes replace (Hong Kong and Macau are quizzed from world-atlas itself)
    replaces: ['China', 'Hong Kong', 'Macao'],
    // what "zoom out" shows: [[west, north], [east, south]]
    home: [[72, 54], [136, 17]],
    // lakes to draw over the grey backdrop: those inside [[west, south], [east, north]]
    lakes: [[60, 10], [150, 60]],
    out: '../src/categories/china/data/china.json',
  },
  us: {
    adm0: 'USA',
    targets: STATES,
    replaces: ['United States of America'],
    home: [[-126, 50], [-66, 24]], // the lower 48; Alaska and Hawaii are a fly-to away
    // world-atlas's Canada counts its half of the Great Lakes as land, so the lakes need drawing back in
    lakes: [[-170, 15], [-50, 75]],
    out: '../src/categories/us-states/data/us.json',
  },
};

const which = process.argv[2];
const map = MAPS[which];
if (!map) throw new Error(`Usage: node scripts/build-admin1-data.mjs <${Object.keys(MAPS).join('|')}>`);

// The "_lakes" version cuts large lakes out of the shapes. Without it, state lines run out to the
// middle of the Great Lakes, so Michigan is drawn touching Wisconsin across Lake Michigan.
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const ADMIN1_URL = NE + 'ne_50m_admin_1_states_provinces_lakes.geojson';
const LAKES_URL = NE + 'ne_50m_lakes.geojson';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const W = 2000;
const LAT_TOP = 80, LAT_BOT = -57;
const projection = geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
const round = (n) => Math.round(n * 10) / 10;
const yTop = round(projection([0, LAT_TOP])[1]);
const yBot = round(projection([0, LAT_BOT])[1]);
projection.clipExtent([[0, yTop], [W, yBot]]);
// Quiz shapes get two decimals, not one: Macau is under a map unit across at this scale.
const path = geoPath(projection).digits(2);
const coarse = geoPath(projection).digits(1);

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const countries = feature(topo, topo.objects.countries).features;
const byCountry = new Map(countries.map((f) => [f.properties.name, f]));

const admin1 = (await getJson(ADMIN1_URL)).features.filter((f) => f.properties.adm0_a3 === map.adm0);
const byDivision = new Map(admin1.map((f) => [f.properties.name, f]));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const used = new Set();
const targets = map.targets.map(([name, source, region, aliases = []]) => {
  const f = typeof source === 'string' ? byDivision.get(source) : byCountry.get(source.country);
  if (!f) throw new Error(`No map feature for ${name}`);
  used.add(f);

  // Focus frame: the main landmass plus comparably-sized pieces, so offshore specks (the South
  // China Sea islets Natural Earth files under Hainan, the far Aleutians) don't drag the frame out to sea.
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const parts = polys.map((coordinates) => {
    const g = { type: 'Polygon', coordinates };
    const [[x0, y0], [x1, y1]] = path.bounds(g);
    return { x0, y0, x1, y1, area: path.area(g) };
  });
  const maxArea = Math.max(...parts.map((p) => p.area));
  const keep = parts.filter((p) => p.area >= maxArea * 0.12);
  const x0 = Math.min(...keep.map((p) => p.x0)), y0 = Math.min(...keep.map((p) => p.y0));
  const x1 = Math.max(...keep.map((p) => p.x1)), y1 = Math.max(...keep.map((p) => p.y1));

  return {
    id: slug(name),
    name,
    region,
    alt: aliases,
    d: path(f),
    f: [round(x0), round(y0), round(x1 - x0), round(y1 - y0)],
    a: Math.round(parts.reduce((s, p) => s + p.area, 0)),
  };
});

// ── Grey context: every other country, plus the country's own divisions that aren't quizzed (DC) ──
const replaced = new Set(map.replaces);
const context = [
  ...countries.filter((f) => !replaced.has(f.properties.name) && f.properties.name !== 'Antarctica').map((f) => coarse(f)),
  ...admin1.filter((f) => !used.has(f)).map((f) => path(f)),
]
  .filter(Boolean)
  .join('');

// ── Borders: country borders + coastlines from world-atlas, plus the divisions' own outlines ──
const geoms = topo.objects.countries.geometries.filter((g) => g.id !== '010');
const collection = { type: 'GeometryCollection', geometries: geoms };
const lines = [...mesh(topo, collection, (a, b) => a !== b).coordinates, ...mesh(topo, collection, (a, b) => a === b).coordinates];
const divisionRings = admin1.flatMap((f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates));
const borders = coarse({ type: 'MultiLineString', coordinates: lines }) + path({ type: 'MultiLineString', coordinates: divisionRings });

// ── Lakes: drawn in water color over the grey context (quiz shapes already have theirs cut out) ──
const [[lw, ls], [le, ln]] = map.lakes;
const lakes = (await getJson(LAKES_URL)).features
  .filter((f) => {
    const [[w, s], [e, n]] = geoBounds(f);
    return w >= lw && e <= le && s >= ls && n <= ln;
  })
  .map((f) => coarse(f))
  .filter(Boolean)
  .join('');

const ocean = `M0,${yTop}H${W}V${yBot}H0Z`;
const graticule = coarse(geoGraticule().step([30, 30]).extent([[-180, LAT_BOT], [180, LAT_TOP]])());

const [[hx0, hy0], [hx1, hy1]] = map.home.map((p) => projection(p));
const home = [round(hx0), round(hy0), round(hx1 - hx0), round(hy1 - hy0)];

const out = { w: W, top: yTop, bottom: yBot, home, ocean, graticule, context, lakes, borders, countries: targets };
const json = JSON.stringify(out);
writeFileSync(new URL(map.out, import.meta.url), json);

const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
console.log(`${which}: ${kb(json)} — ${targets.length} targets, context ${kb(context)}, lakes ${kb(lakes)}, borders ${kb(borders)}`);
