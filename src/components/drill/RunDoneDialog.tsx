import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type DrillCopy, pluralize } from '@/lib/drill/copy';
import type { RunState } from '@/lib/drill/types';

interface RunDoneDialogProps {
  open: boolean;
  run: RunState;
  copy: DrillCopy;
  onPlayAgain: () => void;
  onHome: () => void;
}

// Shown when a run gets through every target without a miss.
export function RunDoneDialog({ open, run, copy, onPlayAgain, onHome }: RunDoneDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Flawless!</DialogTitle>
        </DialogHeader>

        <div className="text-center">
          <span className="text-4xl font-semibold">{run.correct}</span>
          <span className="text-lg text-muted-foreground"> / {run.order.length}</span>
          <p className="mt-1 text-sm text-muted-foreground">
            All {pluralize(run.order.length, copy)}, no misses
            {run.newBest ? ' · New personal best!' : ''}
          </p>
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
