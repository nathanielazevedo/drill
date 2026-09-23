import { hashStr, seededRand, shuffled } from './rng';
import type { Country, Mode, RunState, Store, WorldData } from './types';

export const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;

export const MODES: Record<Mode, { name: string }> = {
  strict: { name: 'Sudden Death' },
  free: { name: 'Free Play' },
  missed: { name: 'Missed Only' },
};

export const CHOICES = 8;

const STORAGE_KEY = 'shit-you-should-know.countries.v1';

export function byIdMap(world: WorldData): Map<string, Country> {
  return new Map(world.countries.map((c) => [c.id, c]));
}

// Every run uses the same order: one fixed shuffle of all countries. A region or the missed
// list is just that order with the other countries filtered out, so runs stay repeatable.
export function masterOrder(world: WorldData): string[] {
  const ids = world.countries.map((c) => c.id).sort();
  return shuffled(ids, seededRand(0x9e3779b9));
}

export function inMasterOrder(order: string[], ids: string[]): string[] {
  const want = new Set(ids);
  return order.filter((id) => want.has(id));
}

export function regionPool(world: WorldData, region: string): string[] {
  return world.countries.filter((c) => region === 'All' || c.region === region).map((c) => c.id);
}

// Multiple choice: the answer plus 7 others, drawn from its own region first so they're plausible,
// then listed A–Z. Seeded by country, so a country always gets the same options.
export function choicesFor(world: WorldData, byId: Map<string, Country>, id: string): string[] {
  const country = byId.get(id)!;
  const rand = seededRand(hashStr(id));
  const others = world.countries.filter((c) => c.id !== id);
  const near = shuffled(others.filter((c) => c.region === country.region).map((c) => c.id), rand);
  const far = shuffled(others.filter((c) => c.region !== country.region).map((c) => c.id), rand);
  return [id, ...near.concat(far).slice(0, CHOICES - 1)].sort((a, b) =>
    byId.get(a)!.name.localeCompare(byId.get(b)!.name),
  );
}

export function bestKey(mode: Mode, region: string): string {
  return `${mode}:${region}`;
}

export function defaultStore(): Store {
  return { v: 1, missed: {}, best: {}, region: 'All', run: null };
}

export function loadStore(world: WorldData): Store {
  const byId = byIdMap(world);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return defaultStore();
    const out: Store = { ...defaultStore(), ...parsed };
    for (const id of Object.keys(out.missed || {})) if (!byId.has(id)) delete out.missed[id];
    if (!(REGIONS as readonly string[]).includes(out.region)) out.region = 'All';
    const r = out.run;
    const valid =
      !!r &&
      !!MODES[r.mode] &&
      Array.isArray(r.order) &&
      r.order.length > 0 &&
      r.order.every((id) => byId.has(id)) &&
      r.i < r.order.length;
    out.run = valid ? r : null;
    if (out.run) {
      out.run.results = out.run.results || {};
      out.run.misses = Array.isArray(out.run.misses) ? out.run.misses : [];
      out.run.correct = out.run.correct | 0;
      out.run.wrong = out.run.wrong | 0;
    }
    return out;
  } catch {
    return defaultStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked: keep playing, just don't persist
  }
}

export function missedIds(store: Store): string[] {
  return Object.keys(store.missed);
}

export function startRun(world: WorldData, store: Store, mode: Mode): RunState | null {
  const ids = mode === 'missed' ? missedIds(store) : regionPool(world, store.region);
  if (!ids.length) return null;
  return {
    mode,
    region: mode === 'missed' ? 'All' : store.region,
    order: inMasterOrder(masterOrder(world), ids),
    i: 0,
    results: {},
    correct: 0,
    wrong: 0,
    misses: [],
  };
}
