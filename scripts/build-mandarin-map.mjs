// Draws a made-up map for the Mandarin Map category: every building block (rén, dà, diàn...) is a
// territory, and the blocks of each theme form a continent. Blocks that build a word together are
// pulled toward each other, so diàn and nǎo tend to share a border. Written out in the same shape as
// src/data/world.json, so the shared map engine draws it unchanged.
// Run: npm run build:mandarin-map (deterministic: the same blocks always give the same map)
import { readFileSync, writeFileSync } from 'node:fs';
import { contours } from 'd3-contour';

const SRC = new URL('../src/categories/mandarin-map/data/blocks.json', import.meta.url);
const OUT = new URL('../src/categories/mandarin-map/data/map.json', import.meta.url);

const { themes, pieces, words } = JSON.parse(readFileSync(SRC, 'utf8'));

const W = 2000;
const H = 1375; // the map frame's 16:11
const CELL = 3; // raster resolution, in map units
const GW = Math.ceil(W / CELL);
const GH = Math.ceil(H / CELL);
const S = 100; // spacing between neighboring territories' seeds

// Rough continent positions; the layout below settles them. Related themes sit side by side.
const HOMES = {
  'People & body': [430, 400],
  Describing: [1000, 290],
  Time: [1570, 340],
  Doing: [960, 740],
  Directions: [1570, 770],
  Places: [1530, 1130],
  Things: [420, 960],
  Nature: [1000, 1160],
};

// Each continent's own soft color, so the themes read as separate lands.
const TINTS = {
  'People & body': '#c5d3e6',
  Describing: '#e3d2b8',
  Time: '#d6cde6',
  Doing: '#e8dcae',
  Directions: '#cbdcc3',
  Places: '#e6c9cf',
  Things: '#c3dcd8',
  Nature: '#dcd3c4',
};

// ---- seeded randomness and noise ----

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260925);

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
/** fractal noise in about [-1, 1] */
function fbm(x, y, seed) {
  let sum = 0;
  let amp = 0.55;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 101);
    amp *= 0.5;
    f *= 2.1;
  }
  return sum;
}

// ---- 1. place a seed per block ----

const byId = new Map(pieces.map((p, i) => [p.id, i]));
const degree = new Array(pieces.length).fill(0);
const links = words.map((w) => w.parts.map((id) => byId.get(id)));
for (const [a, b] of links) {
  degree[a]++;
  degree[b]++;
}

// Each continent starts as a sunflower spiral around its home, then a small force layout packs the
// seeds evenly, keeps the continents apart, and pulls word-building pairs together.
const seeds = pieces.map((p) => ({ x: 0, y: 0, theme: p.theme }));
for (const theme of themes) {
  const members = pieces.map((p, i) => [p, i]).filter(([p]) => p.theme === theme);
  const [hx, hy] = HOMES[theme];
  members.forEach(([, i], k) => {
    const r = S * 0.55 * Math.sqrt(k + 0.5);
    const t = k * 2.39996 + rand();
    seeds[i].x = hx + r * Math.cos(t);
    seeds[i].y = hy + r * Math.sin(t);
  });
}

for (let step = 0; step < 900; step++) {
  const cool = 1 - step / 900;
  const fx = new Array(seeds.length).fill(0);
  const fy = new Array(seeds.length).fill(0);
  for (let i = 0; i < seeds.length; i++) {
    const [hx, hy] = HOMES[seeds[i].theme];
    fx[i] += (hx - seeds[i].x) * 0.004;
    fy[i] += (hy - seeds[i].y) * 0.004;
    for (let j = i + 1; j < seeds.length; j++) {
      const dx = seeds[j].x - seeds[i].x;
      const dy = seeds[j].y - seeds[i].y;
      const d = Math.hypot(dx, dy) || 0.01;
      // same continent: an even packing; different continents: room for a sea between
      const want = seeds[i].theme === seeds[j].theme ? S : S * 2.8;
      if (d < want) {
        const push = ((want - d) / d) * 0.25;
        fx[i] -= dx * push;
        fy[i] -= dy * push;
        fx[j] += dx * push;
        fy[j] += dy * push;
      }
    }
  }
  for (const [a, b] of links) {
    const dx = seeds[b].x - seeds[a].x;
    const dy = seeds[b].y - seeds[a].y;
    const d = Math.hypot(dx, dy);
    if (d <= S) continue;
    const k = seeds[a].theme === seeds[b].theme ? 0.01 : 0.002;
    fx[a] += dx * k;
    fy[a] += dy * k;
    fx[b] -= dx * k;
    fy[b] -= dy * k;
  }
  for (let i = 0; i < seeds.length; i++) {
    const m = Math.hypot(fx[i], fy[i]);
    const cap = 8 * cool + 0.5;
    const s = m > cap ? cap / m : 1;
    seeds[i].x += fx[i] * s;
    seeds[i].y += fy[i] * s;
  }
}

// Fit everything into the frame with a margin of sea.
{
  const R = S * 0.9;
  const xs = seeds.map((s) => s.x);
  const ys = seeds.map((s) => s.y);
  const [x0, x1, y0, y1] = [Math.min(...xs) - R, Math.max(...xs) + R, Math.min(...ys) - R, Math.max(...ys) + R];
  const pad = 70;
  const k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad - 40) / (y1 - y0), 1.25);
  const ox = (W - (x1 - x0) * k) / 2;
  const oy = (H - (y1 - y0) * k) / 2 + 20; // continent names sit above their land
  for (const s of seeds) {
    s.x = ox + (s.x - x0) * k;
    s.y = oy + (s.y - y0) * k;
  }
  console.log(`layout scale ${k.toFixed(2)}`);
}

// ---- 2. rasterize: land, then which territory each land cell belongs to ----

const SEA = -1;
const owner = new Int16Array(GW * GH).fill(SEA);
const weight = pieces.map((_, i) => Math.min(degree[i], 6) * 2.5); // busier blocks get a bit more room

for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    const x = (gx + 0.5) * CELL;
    const y = (gy + 0.5) * CELL;
    // coast: within reach of a seed, give or take some noise
    const coastNoise = fbm(x / 210, y / 210, 7) * S * 0.5;
    // borders: measured from a warped point, so they wander instead of running straight
    const wx = x + fbm(x / 120, y / 120, 13) * S * 0.33;
    const wy = y + fbm(x / 120, y / 120, 29) * S * 0.33;
    let best = Infinity;
    let bestI = -1;
    let nearest = Infinity;
    for (let i = 0; i < seeds.length; i++) {
      const d = Math.hypot(x - seeds[i].x, y - seeds[i].y);
      if (d < nearest) nearest = d;
      const dw = Math.hypot(wx - seeds[i].x, wy - seeds[i].y) - weight[i];
      if (dw < best) {
        best = dw;
        bestI = i;
      }
    }
    if (nearest < S * 0.78 + coastNoise) owner[gy * GW + gx] = bestI;
  }
}

// ---- 3. tidy up: one piece per territory, no specks of land, no pinhole lakes ----

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function components(pred) {
  const seen = new Uint8Array(GW * GH);
  const out = [];
  for (let start = 0; start < GW * GH; start++) {
    if (seen[start] || !pred(start)) continue;
    const comp = [start];
    seen[start] = 1;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k];
      const cx = c % GW;
      const cy = (c - cx) / GW;
      for (const [dx, dy] of N4) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const n = ny * GW + nx;
        if (!seen[n] && pred(n)) {
          seen[n] = 1;
          comp.push(n);
        }
      }
    }
    out.push(comp);
  }
  return out;
}
function neighborOwners(cells) {
  const counts = new Map();
  const inComp = new Set(cells);
  for (const c of cells) {
    const cx = c % GW;
    const cy = (c - cx) / GW;
    for (const [dx, dy] of N4) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (inComp.has(n)) continue;
      counts.set(owner[n], (counts.get(owner[n]) || 0) + 1);
    }
  }
  return counts;
}
/** the territory most of these cells border, or the sea if they don't touch land */
function mostCommonLand(counts) {
  let to = SEA;
  let most = 0;
  for (const [o, n] of counts) {
    if (o !== SEA && n > most) {
      most = n;
      to = o;
    }
  }
  return to;
}

for (let pass = 0; pass < 4; pass++) {
  let changed = 0;
  for (let i = 0; i < pieces.length; i++) {
    const comps = components((c) => owner[c] === i).sort((a, b) => b.length - a.length);
    for (const comp of comps.slice(1)) {
      // a stray bit of territory goes to the land around it, or to the sea if it's off on its own
      const to = mostCommonLand(neighborOwners(comp));
      for (const c of comp) owner[c] = to;
      changed++;
    }
  }
  if (!changed) break;
}
{
  // small enclosed pools of sea get filled in; bigger ones stay as lakes
  const seaComps = components((c) => owner[c] === SEA);
  for (const comp of seaComps) {
    if (comp.length > 120) continue;
    const touchesEdge = comp.some((c) => {
      const cx = c % GW;
      const cy = (c - cx) / GW;
      return cx === 0 || cy === 0 || cx === GW - 1 || cy === GH - 1;
    });
    if (touchesEdge) continue;
    const to = mostCommonLand(neighborOwners(comp));
    for (const c of comp) owner[c] = to;
  }
}

// ---- 4. trace each territory's outline ----

const gen = contours().size([GW, GH]).thresholds([0.5]);
const indicator = new Float64Array(GW * GH);

function smoothRing(ring) {
  // d3-contour closes rings by repeating the first point
  let pts = ring.slice(0, -1);
  for (let it = 0; it < 3; it++) {
    pts = pts.map((p, k) => {
      const a = pts[(k - 1 + pts.length) % pts.length];
      const b = pts[(k + 1) % pts.length];
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
    });
  }
  // drop points that barely bend the line, to keep the file small
  const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const prev = out[out.length - 1];
    const next = pts[(k + 1) % pts.length];
    const p = pts[k];
    const cross = Math.abs((p[0] - prev[0]) * (next[1] - prev[1]) - (p[1] - prev[1]) * (next[0] - prev[0]));
    const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    if (cross / len > 0.06 || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 4) out.push(p);
  }
  return out;
}
const fmt = (n) => (Math.round(n * CELL * 10) / 10).toString();
function ringPath(pts) {
  return 'M' + pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join('L') + 'Z';
}
function signedArea(pts) {
  let a = 0;
  for (let k = 0; k < pts.length; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[(k + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

const shapes = pieces.map((_, i) => {
  for (let c = 0; c < owner.length; c++) indicator[c] = owner[c] === i ? 1 : 0;
  const [mp] = gen(indicator);
  let d = '';
  let outerSign = 0;
  for (const polygon of mp.coordinates) {
    polygon.forEach((ring, r) => {
      const pts = smoothRing(ring);
      if (r === 0 && !outerSign) outerSign = Math.sign(signedArea(pts));
      d += ringPath(pts);
    });
  }
  return { d, outerSign };
});

// ---- 5. where each label goes: the point deepest inside its territory ----

const depth = new Int32Array(GW * GH).fill(-1);
{
  const queue = [];
  for (let c = 0; c < owner.length; c++) {
    if (owner[c] === SEA) continue;
    const cx = c % GW;
    const cy = (c - cx) / GW;
    const edge = N4.some(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx < 0 || ny < 0 || nx >= GW || ny >= GH || owner[ny * GW + nx] !== owner[c];
    });
    if (edge) {
      depth[c] = 0;
      queue.push(c);
    }
  }
  for (let k = 0; k < queue.length; k++) {
    const c = queue[k];
    const cx = c % GW;
    const cy = (c - cx) / GW;
    for (const [dx, dy] of N4) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (depth[n] !== -1 || owner[n] !== owner[c]) continue;
      depth[n] = depth[c] + 1;
      queue.push(n);
    }
  }
}

const info = pieces.map(() => ({ deep: -1, dSeed: Infinity, lx: 0, ly: 0, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, n: 0 }));
for (let c = 0; c < owner.length; c++) {
  const i = owner[c];
  if (i === SEA) continue;
  const cx = c % GW;
  const cy = (c - cx) / GW;
  const t = info[i];
  t.n++;
  t.x0 = Math.min(t.x0, cx);
  t.y0 = Math.min(t.y0, cy);
  t.x1 = Math.max(t.x1, cx + 1);
  t.y1 = Math.max(t.y1, cy + 1);
  // ties go to the cell nearest the seed, which keeps labels off to one side from drifting
  const dSeed = Math.hypot((cx + 0.5) * CELL - seeds[i].x, (cy + 0.5) * CELL - seeds[i].y);
  if (depth[c] > t.deep || (depth[c] === t.deep && dSeed < t.dSeed)) {
    t.deep = depth[c];
    t.dSeed = dSeed;
    t.lx = (cx + 0.5) * CELL;
    t.ly = (cy + 0.5) * CELL;
  }
}

const r1 = (n) => Math.round(n * 10) / 10;
const labels = [];
const countries = pieces.map((p, i) => {
  const t = info[i];
  if (!t.n) throw new Error(`${p.id} ended up with no land`);
  // big enough to read once the map has flown in, small enough to fit inside the territory
  const s = Math.min(19, Math.max(10, (2.6 * t.deep * CELL) / Math.max(p.pinyin.length, 3)));
  labels.push({ x: r1(t.lx), y: r1(t.ly), t: p.pinyin, s: r1(s), id: p.id });
  return {
    id: p.id,
    name: p.en,
    region: p.theme,
    alt: [],
    tint: TINTS[p.theme],
    d: shapes[i].d,
    f: [t.x0 * CELL, t.y0 * CELL, (t.x1 - t.x0) * CELL, (t.y1 - t.y0) * CELL].map(r1),
    a: Math.round(t.n * CELL * CELL),
  };
});

// Continent names, in the sea next to each one: above it if there's room, else below or beside it.
const placed = [];
function clearOfLand(x, y, w, h) {
  const pad = 8;
  for (const [px, py, pw, ph] of placed) {
    if (Math.abs(px - x) < (pw + w) / 2 + pad && Math.abs(py - y) < (ph + h) / 2 + pad) return false;
  }
  for (let gy = Math.floor((y - h / 2 - pad) / CELL); gy <= (y + h / 2 + pad) / CELL; gy++) {
    for (let gx = Math.floor((x - w / 2 - pad) / CELL); gx <= (x + w / 2 + pad) / CELL; gx++) {
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return false;
      if (owner[gy * GW + gx] !== SEA) return false;
    }
  }
  return true;
}
for (const theme of themes) {
  const idx = pieces.map((p, i) => (p.theme === theme ? i : -1)).filter((i) => i >= 0);
  const x0 = Math.min(...idx.map((i) => info[i].x0)) * CELL;
  const x1 = Math.max(...idx.map((i) => info[i].x1)) * CELL;
  const y0 = Math.min(...idx.map((i) => info[i].y0)) * CELL;
  const y1 = Math.max(...idx.map((i) => info[i].y1)) * CELL;
  const t = theme.toUpperCase();
  const s = 17;
  const w = t.length * (s * 0.68 + 3);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const spots = [];
  for (const dx of [0, -0.15, 0.15, -0.3, 0.3]) spots.push([cx + dx * (x1 - x0), y0 - 14], [cx + dx * (x1 - x0), y1 + 14]);
  for (const dy of [0, -0.25, 0.25]) spots.push([x0 - w / 2 - 6, cy + dy * (y1 - y0)], [x1 + w / 2 + 6, cy + dy * (y1 - y0)]);
  const [x, y] = spots.find(([x, y]) => clearOfLand(x, y, w, s)) ?? spots[0];
  if (!clearOfLand(x, y, w, s)) console.warn(`no clear spot for ${theme}'s name`);
  placed.push([x, y, w, s]);
  labels.push({ x: r1(x), y: r1(y), t, s, k: 'sea' });
}

// ---- 6. each word: a bridge between its two blocks ----
// The page draws a word as both blocks' shapes plus this bridge; they're not repeated here.

function bridge(a, b, width, sign) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len;
  const ny = (bx - ax) / len;
  const bend = len * 0.12;
  const cx = (ax + bx) / 2 + nx * bend;
  const cy = (ay + by) / 2 + ny * bend;
  const left = [];
  const right = [];
  const STEPS = 24;
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS;
    const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
    const tx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
    const ty = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
    const tl = Math.hypot(tx, ty) || 1;
    left.push([x - (ty / tl) * (width / 2), y + (tx / tl) * (width / 2)]);
    right.push([x + (ty / tl) * (width / 2), y - (tx / tl) * (width / 2)]);
  }
  let ring = [...left, ...right.reverse()];
  // wind the same way as the territories, or where they overlap the fill would cancel out
  if (Math.sign(signedArea(ring)) !== sign) ring = ring.reverse();
  return 'M' + ring.map(([x, y]) => `${r1(x)},${r1(y)}`).join('L') + 'Z';
}

const wordShapes = words.map((w) => {
  const [a, b] = w.parts.map((id) => byId.get(id));
  const [ca, cb] = [countries[a], countries[b]];
  const la = labels[a];
  const lb = labels[b];
  const x0 = Math.min(ca.f[0], cb.f[0]);
  const y0 = Math.min(ca.f[1], cb.f[1]);
  const x1 = Math.max(ca.f[0] + ca.f[2], cb.f[0] + cb.f[2]);
  const y1 = Math.max(ca.f[1] + ca.f[3], cb.f[1] + cb.f[3]);
  return {
    id: w.id,
    bridge: bridge([la.x, la.y], [lb.x, lb.y], 7, shapes[a].outerSign),
    f: [x0, y0, x1 - x0, y1 - y0].map(r1),
    a: ca.a + cb.a,
  };
});

// ---- write ----

let graticule = '';
for (let x = 125; x < W; x += 125) graticule += `M${x},0V${H}`;
for (let y = 125; y < H; y += 125) graticule += `M0,${y}H${W}`;

// "Zoom out" frames the land, not the whole sea around it.
const land = info.reduce(
  (b, t) => [Math.min(b[0], t.x0), Math.min(b[1], t.y0), Math.max(b[2], t.x1), Math.max(b[3], t.y1)],
  [Infinity, Infinity, -Infinity, -Infinity],
);
const HOME_PAD = 40;
const home = [land[0] * CELL - HOME_PAD, land[1] * CELL - HOME_PAD, (land[2] - land[0]) * CELL + 2 * HOME_PAD, (land[3] - land[1]) * CELL + 2 * HOME_PAD].map(r1);

const out = {
  w: W,
  top: 0,
  bottom: H,
  home,
  noWrap: true,
  ocean: `M0,0H${W}V${H}H0Z`,
  graticule,
  context: '',
  borders: shapes.map((s) => s.d).join(''),
  countries,
  labels,
  words: wordShapes,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${pieces.length} territories, ${words.length} words, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
