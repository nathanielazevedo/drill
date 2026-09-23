import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type DrillCopy, pluralize } from '@/lib/drill/copy';
import type { DrillTarget, Store } from '@/lib/drill/types';

interface MissedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  byId: Map<string, DrillTarget>;
  copy: DrillCopy;
  onDrill: () => void;
  onClear: () => void;
}

export function MissedDialog({ open, onOpenChange, store, byId, copy, onDrill, onClear }: MissedDialogProps) {
  const [armed, setArmed] = useState(false);
  const entries = Object.entries(store.missed).sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setArmed(false);
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Missed {copy.nounPlural}</DialogTitle>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing here yet. {copy.nounPlural[0].toUpperCase() + copy.nounPlural.slice(1)} you get wrong land on this
            list so you can drill them later.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{pluralize(entries.length, copy)}. Get one right in Missed Only to clear it.</p>
            <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border text-sm">
              {entries.map(([id, m]) => (
                <li key={id} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{byId.get(id)?.name}</span>
                  <span className="text-xs text-muted-foreground">{byId.get(id)?.region}</span>
                  <span className="text-xs text-muted-foreground">×{m.n}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={onDrill}>
                Drill these
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (!armed) {
                    setArmed(true);
                    return;
                  }
                  onClear();
                  setArmed(false);
                }}
              >
                {armed ? 'Tap again to clear' : 'Clear list'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
