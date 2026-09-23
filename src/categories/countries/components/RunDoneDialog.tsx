import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Country, RunState } from '../lib/types';

interface RunDoneDialogProps {
  open: boolean;
  run: RunState;
  byId: Map<string, Country>;
  missedCount: number;
  onDrillMissed: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function RunDoneDialog({ open, run, byId, missedCount, onDrillMissed, onPlayAgain, onHome }: RunDoneDialogProps) {
  const total = run.order.length;
  const pct = Math.round((run.correct / total) * 100);
  const title =
    run.mode === 'missed'
      ? run.wrong === 0
        ? 'All mastered!'
        : 'Round done'
      : pct === 100
        ? 'Flawless!'
        : pct >= 90
          ? 'Superb'
          : pct >= 70
            ? 'Nice run'
            : 'Keep drilling';

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="text-center">
          <span className="text-4xl font-semibold">{run.correct}</span>
          <span className="text-lg text-muted-foreground"> / {total}</span>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.mode === 'missed' ? 'mastered' : `${pct}% correct`}
            {run.newBest ? ' · New personal best!' : ''}
          </p>
        </div>

        {run.mode === 'missed' && (
          <p className="text-center text-sm text-muted-foreground">
            {missedCount ? `${missedCount} ${missedCount === 1 ? 'country' : 'countries'} still on your missed list.` : 'Your missed list is empty. Nicely done.'}
          </p>
        )}

        {run.misses.length > 0 && run.mode !== 'missed' && (
          <div className="flex flex-wrap gap-1.5">
            {run.misses.map((m) => (
              <Badge key={m.id} variant="destructive">
                {byId.get(m.id)?.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {missedCount > 0 && (
            <Button type="button" onClick={onDrillMissed}>
              {run.mode === 'missed' ? 'Drill again' : `Drill missed list (${missedCount})`}
            </Button>
          )}
          <Button type="button" variant={missedCount > 0 ? 'outline' : 'default'} onClick={onPlayAgain}>
            {run.mode === 'missed' ? 'Play a full round' : 'Play again'}
          </Button>
          <Button type="button" variant="outline" onClick={onHome}>
            Back to menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
