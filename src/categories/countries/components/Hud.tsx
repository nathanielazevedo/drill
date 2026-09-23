import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MODES, bestKey } from '../lib/logic';
import type { Phase } from '../lib/useGame';
import type { RunState, Store } from '../lib/types';

interface HudProps {
  run: RunState;
  store: Store;
  phase: Phase;
  onQuit: () => void;
}

export function Hud({ run, store, phase, onQuit }: HudProps) {
  const total = run.order.length;
  const settled = phase === 'ok' || phase === 'bad' || phase === 'over';
  const shown = Math.min(run.i + (settled ? 1 : 0), total);
  const where = run.mode === 'missed' ? 'Missed countries' : run.region === 'All' ? 'World' : run.region;
  const best = store.best[bestKey('strict', run.region)] || 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{MODES[run.mode].name}</div>
          <div className="text-xs text-muted-foreground">
            {where} · {phase === 'done' ? total : shown} / {total}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {run.mode === 'strict' ? (
            <>
              <span className="text-right">
                <b>{run.correct}</b> <span className="text-xs text-muted-foreground">streak</span>
              </span>
              <span className="text-right">
                <b>{Math.max(best, run.correct)}</b> <span className="text-xs text-muted-foreground">best</span>
              </span>
            </>
          ) : (
            <>
              <span className="text-right text-emerald-700">
                <b>{run.correct}</b> <span className="text-xs">right</span>
              </span>
              <span className="text-right text-red-700">
                <b>{run.wrong}</b> <span className="text-xs">missed</span>
              </span>
            </>
          )}
          <Button type="button" size="icon" variant="ghost" onClick={onQuit} aria-label="Quit to menu">
            <X />
          </Button>
        </div>
      </div>
      <Progress value={(shown / total) * 100} className="h-1" />
    </div>
  );
}
