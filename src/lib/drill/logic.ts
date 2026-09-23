import { hashStr, seededRand, shuffled } from './rng';
import type { DrillTarget, RunState, Store } from './types';

export const CHOICES = 8;

export function byIdMap(targets: DrillTarget[]): Map<string, DrillTarget> {
  return new Map(targets.map((t) => [t.id, t]));
}

// By default every run uses the same order: one fixed shuffle of every target (or, for categories
// that drill in sequence, the targets' own order). A region is just that order with the other
// targets filtered out, so runs stay repeatable. The Shuffle setting deals a fresh order each run.
export function masterOrder(targets: DrillTarget[]): string[] {
  const ids = targets.map((t) => t.id).sort();
  return shuffled(ids, seededRand(0x9e3779b9));
}

export function inMasterOrder(order: string[], ids: string[]): string[] {
  const want = new Set(ids);
  return order.filter((id) => want.has(id));
}

export function regionPool(targets: DrillTarget[], selected: string[]): string[] {
  return targets.filter((t) => !selected.length || selected.includes(t.region)).map((t) => t.id);
}

// A selection is keyed by its regions in config order, so "Asia + Africa" and "Africa + Asia"
// share one best score. Nothing selected (or everything) is 'All'.
export function regionKey(selected: string[], regions: readonly string[]): string {
  const picked = regions.filter((r) => r !== 'All' && selected.includes(r));
  return picked.length && picked.length < regions.filter((r) => r !== 'All').length ? picked.join(' + ') : 'All';
}

// Toggling a chip: 'All' clears the selection; selecting every region collapses back to 'All'.
export function toggleRegion(selected: string[], region: string, regions: readonly string[]): string[] {
  if (region === 'All') return [];
  const next = selected.includes(region) ? selected.filter((r) => r !== region) : [...selected, region];
  return regionKey(next, regions) === 'All' ? [] : regions.filter((r) => next.includes(r));
}

// Multiple choice: the answer plus 7 others, drawn from its own region first so they're plausible,
// then listed A–Z. Seeded by target, so a given question always gets the same options.
export function choicesFor(targets: DrillTarget[], byId: Map<string, DrillTarget>, id: string): string[] {
  const target = byId.get(id)!;
  const rand = seededRand(hashStr(id));
  const others = targets.filter((t) => t.id !== id);
  const near = shuffled(others.filter((t) => t.region === target.region).map((t) => t.id), rand);
  const far = shuffled(others.filter((t) => t.region !== target.region).map((t) => t.id), rand);
  return [id, ...near.concat(far).slice(0, CHOICES - 1)].sort((a, b) =>
    byId.get(a)!.name.localeCompare(byId.get(b)!.name),
  );
}

// The 'strict:' prefix is left over from when there were other modes; keeping it keeps saved bests.
export function bestKey(region: string): string {
  return `strict:${region}`;
}

export function defaultStore(): Store {
  return { v: 1, best: {}, regions: [], showFacts: true, shuffle: false, run: null };
}

export function loadStore(storageKey: string, targets: DrillTarget[], regions: readonly string[]): Store {
  const byId = byIdMap(targets);
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return defaultStore();
    // older saves kept a single `region` string, and a missed list for the modes since removed
    const { region: legacyRegion, missed: _missed, ...rest } = parsed;
    const out: Store = { ...defaultStore(), ...rest };
    out.best = Object.fromEntries(Object.entries(out.best || {}).filter(([k]) => k.startsWith('strict:')));
    const saved: unknown[] = Array.isArray(out.regions) ? out.regions : typeof legacyRegion === 'string' ? [legacyRegion] : [];
    out.regions = regions.filter((r) => r !== 'All' && saved.includes(r));
    if (regionKey(out.regions, regions) === 'All') out.regions = [];
    out.showFacts = out.showFacts !== false;
    out.shuffle = out.shuffle === true;
    // saved runs may carry fields from the removed Free Play and Missed Only modes
    const { mode, wrong: _wrong, misses: _misses, ...r } = (out.run ?? {}) as RunState & Record<string, unknown>;
    const valid =
      !!out.run &&
      (mode === undefined || mode === 'strict') &&
      Array.isArray(r.order) &&
      r.order.length > 0 &&
      r.order.every((id) => byId.has(id)) &&
      r.i < r.order.length;
    out.run = valid ? { ...r, results: r.results || {}, correct: r.correct | 0 } : null;
    return out;
  } catch {
    return defaultStore();
  }
}

export function saveStore(storageKey: string, store: Store): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // storage full or blocked: keep playing, just don't persist
  }
}

export function startRun(
  targets: DrillTarget[],
  store: Store,
  regions: readonly string[],
  ordered = false,
): RunState | null {
  const ids = regionPool(targets, store.regions);
  if (!ids.length) return null;
  return {
    region: regionKey(store.regions, regions),
    order: store.shuffle
      ? shuffled(ids, Math.random)
      : inMasterOrder(ordered ? targets.map((t) => t.id) : masterOrder(targets), ids),
    i: 0,
    results: {},
    correct: 0,
  };
}
