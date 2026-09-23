import { useEffect, useMemo, useReducer } from 'react';
import {
  bestKey,
  byIdMap,
  choicesFor,
  defaultStore,
  loadStore,
  saveStore,
  startRun as buildRun,
  toggleRegion,
} from './logic';
import type { DrillTarget, Mode, RunState, Store } from './types';

export type Phase = 'asking' | 'ok' | 'bad' | 'over' | 'done';
export type Screen = 'home' | 'game';

interface GameState {
  store: Store;
  activeRun: RunState | null;
  screen: Screen;
  phase: Phase;
  pickedId: string | null;
}

type Action =
  | { type: 'toggleRegion'; region: string }
  | { type: 'setShowFacts'; on: boolean }
  | { type: 'startRun'; mode: Mode }
  | { type: 'resume' }
  | { type: 'pick'; pickedId: string }
  | { type: 'skip' }
  | { type: 'advance' }
  | { type: 'quitToHome' }
  | { type: 'clearMissed' }
  | { type: 'resetAll' };

function recordStrict(store: Store, run: RunState): { store: Store; newBest: boolean } {
  const k = bestKey('strict', run.region);
  const cur = store.best[k] || 0;
  if (run.correct > cur) return { store: { ...store, best: { ...store.best, [k]: run.correct } }, newBest: true };
  return { store, newBest: false };
}

function recordFree(store: Store, run: RunState): { store: Store; newBest: boolean } {
  const pct = Math.round((run.correct / run.order.length) * 100);
  const k = bestKey('free', run.region);
  const cur = store.best[k];
  if (cur == null || pct > cur) return { store: { ...store, best: { ...store.best, [k]: pct } }, newBest: true };
  return { store, newBest: false };
}

function finishRun(state: GameState, run: RunState): GameState {
  let store: Store = { ...state.store, run: null };
  let newBest = false;
  if (run.mode === 'strict') ({ store, newBest } = recordStrict(store, run));
  else if (run.mode === 'free') ({ store, newBest } = recordFree(store, run));
  return { ...state, store, activeRun: { ...run, finished: true, newBest }, phase: 'done', pickedId: null };
}

function applySucceed(state: GameState): GameState {
  const run = state.activeRun!;
  const target = run.order[run.i];
  const newRun: RunState = { ...run, correct: run.correct + 1, results: { ...run.results, [target]: 'ok' } };
  let missed = state.store.missed;
  if (run.mode === 'missed' && missed[target]) {
    missed = { ...missed };
    delete missed[target];
  }
  const store: Store = { ...state.store, missed, run: newRun };
  return { ...state, store, activeRun: newRun, phase: 'ok', pickedId: null };
}

function applyFail(state: GameState, pickedId: string | null): GameState {
  const run = state.activeRun!;
  const target = run.order[run.i];
  const prev = state.store.missed[target];
  const missed = { ...state.store.missed, [target]: { n: (prev?.n || 0) + 1, t: Date.now() } };
  const newRun: RunState = {
    ...run,
    wrong: run.wrong + 1,
    results: { ...run.results, [target]: 'bad' },
    misses: [...run.misses, { id: target, pickedId }],
  };

  if (run.mode === 'strict') {
    const { store: recorded, newBest } = recordStrict({ ...state.store, missed }, newRun);
    const store: Store = { ...recorded, run: null };
    return { ...state, store, activeRun: { ...newRun, finished: true, newBest }, phase: 'over', pickedId };
  }

  const store: Store = { ...state.store, missed, run: newRun };
  return { ...state, store, activeRun: newRun, phase: 'bad', pickedId };
}

function reducer(
  targets: DrillTarget[],
  regions: readonly string[],
  ordered: boolean,
  state: GameState,
  action: Action,
): GameState {
  switch (action.type) {
    case 'toggleRegion':
      return { ...state, store: { ...state.store, regions: toggleRegion(state.store.regions, action.region, regions) } };

    case 'setShowFacts':
      return { ...state, store: { ...state.store, showFacts: action.on } };

    case 'startRun': {
      const run = buildRun(targets, state.store, action.mode, regions, ordered);
      if (!run) return state;
      return {
        ...state,
        store: { ...state.store, run },
        activeRun: run,
        screen: 'game',
        phase: 'asking',
        pickedId: null,
      };
    }

    case 'resume': {
      if (!state.store.run) return state;
      let i = state.store.run.i;
      const order = state.store.run.order;
      const results = state.store.run.results;
      while (i < order.length && results[order[i]]) i++;
      const run: RunState = { ...state.store.run, i };
      if (i >= order.length) return finishRun(state, run);
      return { ...state, store: { ...state.store, run }, activeRun: run, screen: 'game', phase: 'asking', pickedId: null };
    }

    case 'pick': {
      if (state.phase !== 'asking' || !state.activeRun) return state;
      const target = state.activeRun.order[state.activeRun.i];
      return action.pickedId === target ? applySucceed(state) : applyFail(state, action.pickedId);
    }

    case 'skip': {
      if (state.phase !== 'asking' || !state.activeRun) return state;
      return applyFail(state, null);
    }

    case 'advance': {
      if (state.phase !== 'ok' && state.phase !== 'bad') return state;
      const run = state.activeRun!;
      const i = run.i + 1;
      if (i >= run.order.length) return finishRun(state, { ...run, i });
      const newRun = { ...run, i };
      return { ...state, store: { ...state.store, run: newRun }, activeRun: newRun, phase: 'asking', pickedId: null };
    }

    case 'quitToHome':
      if (state.phase === 'over' || state.phase === 'done') return { ...state, screen: 'home', activeRun: null };
      return { ...state, screen: 'home' };

    case 'clearMissed':
      return { ...state, store: { ...state.store, missed: {} } };

    case 'resetAll':
      return { store: defaultStore(), activeRun: null, screen: 'home', phase: 'asking', pickedId: null };

    default:
      return state;
  }
}

export interface DrillConfig {
  /** localStorage key this category's progress is saved under. */
  storageKey: string;
  /** every quizzable target (a country, a lake, ...). */
  targets: DrillTarget[];
  /** the region/type chips shown on the home screen; 'All' means every target. */
  regions: readonly string[];
  /** the category has facts to show after each answer, so offer the "show facts" setting. */
  hasFacts?: boolean;
  /** ask targets in the order given (e.g. presidents 1, 2, 3...) instead of a fixed shuffle. */
  ordered?: boolean;
}

export function useDrillGame({ storageKey, targets, regions, hasFacts = false, ordered = false }: DrillConfig) {
  const byId = useMemo<Map<string, DrillTarget>>(() => byIdMap(targets), [targets]);

  const [state, dispatch] = useReducer(
    (s: GameState, a: Action) => reducer(targets, regions, ordered, s, a),
    targets,
    (t) => {
      const store = loadStore(storageKey, t, regions);
      return { store, activeRun: store.run, screen: 'home' as Screen, phase: 'asking' as Phase, pickedId: null };
    },
  );

  useEffect(() => saveStore(storageKey, state.store), [storageKey, state.store]);

  const showFacts = hasFacts && state.store.showFacts;

  // A correct answer auto-advances after a beat, unless there are facts to read; a wrong one waits for the player.
  const autoAdvance = !showFacts;
  useEffect(() => {
    if (!autoAdvance || state.phase !== 'ok') return;
    const t = setTimeout(() => dispatch({ type: 'advance' }), 900);
    return () => clearTimeout(t);
  }, [autoAdvance, state.phase, state.activeRun]);

  // A finished run's index sits one past the end; keep its last target so the map (and the
  // end-of-run dialog drawn over it) still has something to show.
  const run = state.activeRun;
  const targetId = run ? run.order[Math.min(run.i, run.order.length - 1)] : null;
  const target = targetId ? byId.get(targetId) ?? null : null;
  const choices = useMemo(() => (targetId ? choicesFor(targets, byId, targetId) : []), [targets, byId, targetId]);

  return {
    store: state.store,
    byId,
    regions,
    hasFacts,
    showFacts,
    screen: state.screen,
    phase: state.phase,
    run: state.activeRun,
    target,
    targetId,
    choices,
    pickedId: state.pickedId,
    toggleRegion: (region: string) => dispatch({ type: 'toggleRegion', region }),
    setShowFacts: (on: boolean) => dispatch({ type: 'setShowFacts', on }),
    startRun: (mode: Mode) => dispatch({ type: 'startRun', mode }),
    resume: () => dispatch({ type: 'resume' }),
    pick: (pickedId: string) => dispatch({ type: 'pick', pickedId }),
    skip: () => dispatch({ type: 'skip' }),
    advance: () => dispatch({ type: 'advance' }),
    quitToHome: () => dispatch({ type: 'quitToHome' }),
    clearMissed: () => dispatch({ type: 'clearMissed' }),
    resetAll: () => dispatch({ type: 'resetAll' }),
  };
}

export type DrillGame = ReturnType<typeof useDrillGame>;
