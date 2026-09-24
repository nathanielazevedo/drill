import { Progress } from '@/components/ui/progress';
import type { DrillCopy } from '@/lib/drill/copy';
import { bestKey } from '@/lib/drill/logic';
import type { RunState, Store } from '@/lib/drill/types';
import type { Phase } from '@/lib/drill/useGame';

interface HudProps {
  run: RunState;
  store: Store;
  phase: Phase;
  copy: DrillCopy;
}

export function Hud({ run, store, phase, copy }: HudProps) {
  const total = run.order.length;
  const settled = phase === 'ok' || phase === 'over';
  const shown = Math.min(run.i + (settled ? 1 : 0), total);
  const where = run.region === 'All' ? copy.wholeSet : run.region;
  const best = store.best[bestKey(run.region)] || 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{where}</div>
          <div className="text-xs text-muted-foreground">
            {phase === 'done' ? total : shown} / {total}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-right">
            <b>{run.correct}</b> <span className="text-xs text-muted-foreground">streak</span>
          </span>
          <span className="text-right">
            <b>{Math.max(best, run.correct)}</b> <span className="text-xs text-muted-foreground">best</span>
          </span>
        </div>
      </div>
      <Progress value={(shown / total) * 100} className="h-1" />
    </div>
  );
}
