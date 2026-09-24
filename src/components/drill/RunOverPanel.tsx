import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { bestKey } from '@/lib/drill/logic';
import type { DrillTarget, RunState, Store } from '@/lib/drill/types';

interface RunOverPanelProps {
  run: RunState;
  store: Store;
  target: DrillTarget;
  pickedName?: string;
  /** the category's facts about the missed target, when facts are on */
  facts?: ReactNode;
  onPlayAgain: () => void;
  onHome: () => void;
}

// Shown under the map (or portrait) rather than as a dialog over it, so the answer you missed stays in view.
export function RunOverPanel({ run, store, target, pickedName, facts, onPlayAgain, onHome }: RunOverPanelProps) {
  const best = store.best[bestKey(run.region)] || 0;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-600/30 bg-red-50 px-4 py-3 text-sm text-red-900">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs opacity-80">Run over · it was</div>
          <div className="text-base font-semibold">{target.name}</div>
          {pickedName && <div className="text-xs opacity-80">You picked {pickedName}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold">{run.correct}</div>
          <div className="text-xs opacity-80">{run.newBest ? 'New best!' : `Best ${best}`}</div>
        </div>
      </div>
      {facts && <div className="border-t border-current/15 pt-3">{facts}</div>}
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onPlayAgain}>
          Play again
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onHome}>
          Back to menu
        </Button>
      </div>
    </div>
  );
}
