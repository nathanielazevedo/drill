import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bestKey } from '@/lib/drill/logic';
import type { DrillTarget, RunState, Store } from '@/lib/drill/types';

interface RunOverDialogProps {
  open: boolean;
  run: RunState;
  store: Store;
  target: DrillTarget;
  pickedName?: string;
  /** the category's facts about the missed target, when facts are on */
  facts?: ReactNode;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function RunOverDialog({ open, run, store, target, pickedName, facts, onPlayAgain, onHome }: RunOverDialogProps) {
  const best = store.best[bestKey(run.region)] || 0;
  return (
    <Dialog open={open}>
      <DialogContent className="max-h-[90svh] overflow-y-auto" showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Run over</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <span className="text-4xl font-semibold">{run.correct}</span>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.newBest ? 'New personal best!' : `Best: ${best}`}
          </p>
        </div>
        <div className="rounded-lg border px-4 py-3 text-sm">
          <div className="text-xs text-muted-foreground">It was</div>
          <div className="font-medium">{target.name}</div>
          {pickedName && <div className="mt-1 text-xs text-muted-foreground">You picked {pickedName}</div>}
          {facts}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onPlayAgain}>
            Play again
          </Button>
          <Button type="button" variant="outline" onClick={onHome}>
            Back to menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
