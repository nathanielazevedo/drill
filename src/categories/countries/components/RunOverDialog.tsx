import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bestKey } from '../lib/logic';
import type { Country, RunState, Store } from '../lib/types';

interface RunOverDialogProps {
  open: boolean;
  run: RunState;
  store: Store;
  target: Country;
  pickedName?: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

function missNote(pickedName: string | undefined, none: string): string {
  return pickedName ? `You picked ${pickedName}` : none;
}

export function RunOverDialog({ open, run, store, target, pickedName, onPlayAgain, onHome }: RunOverDialogProps) {
  const best = store.best[bestKey('strict', run.region)] || 0;
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
          <div className="mt-1 text-xs text-muted-foreground">{missNote(pickedName, 'You gave up')}</div>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onPlayAgain}>
            Start over
          </Button>
          <Button type="button" variant="outline" onClick={onHome}>
            Back to menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
