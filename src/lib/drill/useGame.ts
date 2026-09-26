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
import type { DrillTarget, RunState, Store } from './types';

export type Phase = 'asking' | 'ok' | 'over' | 'done';
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
  | { type: 'setShuffle'; on: boolean }
  | { type: 'startRun' }
  | { type: 'resume' }
  | { type: 'pick'; pickedId: string }
  | { type: 'advance' }
  | { type: 'quitToHome' }
  | { type: 'resetAll' };

function recordBest(store: Store, run: RunState): { store: Store; newBest: boolean } {
  const k = bestKey(run.region);
  const cur = store.best[k] || 0;
  if (run.correct > cur) return { store: { ...store, best: { ...store.best, [k]: run.correct } }, newBest: true };
  return { store, newBest: false };
}

function finishRun(state: GameState, run: RunState): GameState {
  const { store, newBest } = recordBest({ ...state.store, run: null }, run);
  return { ...state, store, activeRun: { ...run, finished: true, newBest }, phase: 'done', pickedId: null };
}

function applySucceed(state: GameState): GameState {
  const run = state.activeRun!;
  const target = run.order[run.i];
  const newRun: RunState = { ...run, correct: run.correct + 1, results: { ...run.results, [target]: 'ok' } };
  return { ...state, store: { ...state.store, run: newRun }, activeRun: newRun, phase: 'ok', pickedId: null };
}

// Any miss ends the run.
function applyFail(state: GameState, pickedId: string | null): GameState {
  const run = state.activeRun!;
  const target = run.order[run.i];
  const newRun: RunState = { ...run, results: { ...run.results, [target]: 'bad' } };
  const { store, newBest } = recordBest({ ...state.store, run: null }, newRun);
  return { ...state, store, activeRun: { ...newRun, finished: true, newBest }, phase: 'over', pickedId };
}

function reducer(
  targets: DrillTarget[],
  regions: readonly string[],
  ordered: boolean,
  shuffleBlock: ((t: DrillTarget) => string) | undefined,
  state: GameState,
  action: Action,
): GameState {
  switch (action.type) {
    case 'toggleRegion':
      return { ...state, store: { ...state.store, regions: toggleRegion(state.store.regions, action.region, regions) } };

    case 'setShowFacts':
      return { ...state, store: { ...state.store, showFacts: action.on } };

    case 'setShuffle':
      return { ...state, store: { ...state.store, shuffle: action.on } };

    case 'startRun': {
      const run = buildRun(targets, state.store, regions, ordered, shuffleBlock);
      if (!run) return state;
      // Not saved for resuming until the first answer: leaving straight away shouldn't leave a "Continue 0 of 50".
      return {
        ...state,
        store: { ...state.store, run: null },
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

    case 'advance': {
      if (state.phase !== 'ok') return state;
      const run = state.activeRun!;
      const i = run.i + 1;
      if (i >= run.order.length) return finishRun(state, { ...run, i });
      const newRun = { ...run, i };
      return { ...state, store: { ...state.store, run: newRun }, activeRun: newRun, phase: 'asking', pickedId: null };
    }

    case 'quitToHome':
      if (state.phase === 'over' || state.phase === 'done') return { ...state, screen: 'home', activeRun: null };
      return { ...state, screen: 'home' };

    // Erases scores and the saved run; your settings (region, facts, shuffle) stay as they are.
    case 'resetAll': {
      const { regions: picked, showFacts, shuffle } = state.store;
      return { store: { ...defaultStore(), regions: picked, showFacts, shuffle }, activeRun: null, screen: 'home', phase: 'asking', pickedId: null };
    }

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
  /** with Shuffle on, only shuffle within each block (targets in a row with the same key), not the whole run */
  shuffleBlock?: (t: DrillTarget) => string;
  /** the multiple-choice options for a target, when the category draws them itself */
  drawChoices?: (id: string) => string[];
}

export function useDrillGame({
  storageKey,
  targets,
  regions,
  hasFacts = false,
  ordered = false,
  shuffleBlock,
  drawChoices,
}: DrillConfig) {
  const byId = useMemo<Map<string, DrillTarget>>(() => byIdMap(targets), [targets]);

  const [state, dispatch] = useReducer(
    (s: GameState, a: Action) => reducer(targets, regions, ordered, shuffleBlock, s, a),
    targets,
    (t) => {
      const store = loadStore(storageKey, t, regions);
      return { store, activeRun: store.run, screen: 'home' as Screen, phase: 'asking' as Phase, pickedId: null };
    },
  );

  useEffect(() => saveStore(storageKey, state.store), [storageKey, state.store]);

  const showFacts = hasFacts && state.store.showFacts;

  // A correct answer auto-advances after a beat, unless there are facts to read.
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
  // Redrawn per question: a new target, or the same one again in a new run (each run gets a new
  // `order` array; within a run it's carried along unchanged, so answering doesn't reshuffle).
  const order = run?.order;
  const choices = useMemo(
    () => (targetId ? (drawChoices ? drawChoices(targetId) : choicesFor(targets, byId, targetId)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `order` only marks a new run
    [targets, byId, targetId, order],
  );

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
    setShuffle: (on: boolean) => dispatch({ type: 'setShuffle', on }),
    startRun: () => dispatch({ type: 'startRun' }),
    resume: () => dispatch({ type: 'resume' }),
    pick: (pickedId: string) => dispatch({ type: 'pick', pickedId }),
    advance: () => dispatch({ type: 'advance' }),
    quitToHome: () => dispatch({ type: 'quitToHome' }),
    resetAll: () => dispatch({ type: 'resetAll' }),
  };
}

export type DrillGame = ReturnType<typeof useDrillGame>;
