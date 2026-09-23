// Turns Natural Earth's admin-1 provinces (plus Hong Kong and Macau from world-atlas) into pre-projected
// SVG paths → src/categories/china/data/china.json. Same projection and shape as src/data/world.json, so
// the shared map engine draws it unchanged; everything outside China is grey context.
// Run: npm run build:china-data (downloads the ~2MB Natural Earth file each time)
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoPath, geoGraticule } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { PROVINCES } from './china-provinces.mjs';

const ADMIN1_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson';

const W = 2000;
const LAT_TOP = 80, LAT_BOT = -57;
const projection = geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
const round = (n) => Math.round(n * 10) / 10;
const yTop = round(projection([0, LAT_TOP])[1]);
const yBot = round(projection([0, LAT_BOT])[1]);
projection.clipExtent([[0, yTop], [W, yBot]]);
// Provinces get two decimals, not one: Macau is under a map unit across at this scale.
const path = geoPath(projection).digits(2);
const coarse = geoPath(projection).digits(1);

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const countries = feature(topo, topo.objects.countries).features;
const byCountry = new Map(countries.map((f) => [f.properties.name, f]));

const res = await fetch(ADMIN1_URL);
if (!res.ok) throw new Error(`${res.status} ${ADMIN1_URL}`);
const admin1 = (await res.json()).features.filter((f) => f.properties.adm0_a3 === 'CHN');
const byProvince = new Map(admin1.map((f) => [f.properties.name, f]));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const provinces = PROVINCES.map(([name, neName, region, aliases = []]) => {
  const f = neName ? byProvince.get(neName) : byCountry.get(name === 'Macau' ? 'Macao' : name);
  if (!f) throw new Error(`No map feature for ${name} (${neName})`);

  // Focus frame: the main landmass plus comparably-sized pieces, so offshore specks (the South
  // China Sea islets Natural Earth files under Hainan) don't drag the frame out to sea.
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

// ── Grey context: every other country ──
const quizCountries = new Set(['China', 'Hong Kong', 'Macao']);
const context = countries
  .filter((f) => !quizCountries.has(f.properties.name) && f.properties.name !== 'Antarctica')
  .map((f) => coarse(f))
  .filter(Boolean)
  .join('');

// ── Borders: country borders + coastlines from world-atlas, plus the provinces' own outlines ──
const geoms = topo.objects.countries.geometries.filter((g) => g.id !== '010');
const collection = { type: 'GeometryCollection', geometries: geoms };
const lines = [...mesh(topo, collection, (a, b) => a !== b).coordinates, ...mesh(topo, collection, (a, b) => a === b).coordinates];
const provinceRings = admin1.flatMap((f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates));
const borders = coarse({ type: 'MultiLineString', coordinates: lines }) + path({ type: 'MultiLineString', coordinates: provinceRings });

const ocean = `M0,${yTop}H${W}V${yBot}H0Z`;
const graticule = coarse(geoGraticule().step([30, 30]).extent([[-180, LAT_BOT], [180, LAT_TOP]])());

// Where "zoom out" goes: mainland China with a little margin.
const [[hx0, hy0], [hx1, hy1]] = [projection([72, 54]), projection([136, 17])];
const home = [round(hx0), round(hy0), round(hx1 - hx0), round(hy1 - hy0)];

const out = { w: W, top: yTop, bottom: yBot, home, ocean, graticule, context, borders, countries: provinces };
const json = JSON.stringify(out);
writeFileSync(new URL('../src/categories/china/data/china.json', import.meta.url), json);

const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
console.log(`china.json ${kb(json)} — ${provinces.length} provinces, context ${kb(context)}, borders ${kb(borders)}`);
