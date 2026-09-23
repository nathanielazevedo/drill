import { hashStr, seededRand, shuffled } from './rng';
import type { DrillTarget, Mode, RunState, Store } from './types';

export const MODES: Record<Mode, { name: string }> = {
  strict: { name: 'Sudden Death' },
  free: { name: 'Free Play' },
  missed: { name: 'Missed Only' },
};

export const CHOICES = 8;

export function byIdMap(targets: DrillTarget[]): Map<string, DrillTarget> {
  return new Map(targets.map((t) => [t.id, t]));
}

// Every run uses the same order: one fixed shuffle of every target (or, for categories that
// drill in sequence, the targets' own order). A region or the missed
// list is just that order with the other targets filtered out, so runs stay repeatable.
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

export function bestKey(mode: Mode, region: string): string {
  return `${mode}:${region}`;
}

export function defaultStore(): Store {
  return { v: 1, missed: {}, best: {}, regions: [], showFacts: true, run: null };
}

export function loadStore(storageKey: string, targets: DrillTarget[], regions: readonly string[]): Store {
  const byId = byIdMap(targets);
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return defaultStore();
    const { region: legacyRegion, ...rest } = parsed;
    const out: Store = { ...defaultStore(), ...rest };
    for (const id of Object.keys(out.missed || {})) if (!byId.has(id)) delete out.missed[id];
    // older saves kept a single `region` string
    const saved: unknown[] = Array.isArray(out.regions) ? out.regions : typeof legacyRegion === 'string' ? [legacyRegion] : [];
    out.regions = regions.filter((r) => r !== 'All' && saved.includes(r));
    if (regionKey(out.regions, regions) === 'All') out.regions = [];
    out.showFacts = out.showFacts !== false;
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

export function saveStore(storageKey: string, store: Store): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // storage full or blocked: keep playing, just don't persist
  }
}

export function missedIds(store: Store): string[] {
  return Object.keys(store.missed);
}

export function startRun(
  targets: DrillTarget[],
  store: Store,
  mode: Mode,
  regions: readonly string[],
  ordered = false,
): RunState | null {
  const ids = mode === 'missed' ? missedIds(store) : regionPool(targets, store.regions);
  if (!ids.length) return null;
  return {
    mode,
    region: mode === 'missed' ? 'All' : regionKey(store.regions, regions),
    order: inMasterOrder(ordered ? targets.map((t) => t.id) : masterOrder(targets), ids),
    i: 0,
    results: {},
    correct: 0,
    wrong: 0,
    misses: [],
  };
}
