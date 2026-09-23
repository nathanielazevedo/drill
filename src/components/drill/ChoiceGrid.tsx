import { cn } from '@/lib/utils';
import type { DrillTarget } from '@/lib/drill/types';

interface ChoiceGridProps {
  choices: string[];
  byId: Map<string, DrillTarget>;
  targetId: string | null;
  pickedId: string | null;
  locked: boolean;
  onPick: (id: string) => void;
}

export function ChoiceGrid({ choices, byId, targetId, pickedId, locked, onPick }: ChoiceGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {choices.map((id) => {
        const isTarget = id === targetId;
        const isWrongPick = locked && id === pickedId && !isTarget;
        const revealOk = locked && isTarget;
        return (
          <button
            key={id}
            type="button"
            disabled={locked}
            onClick={() => onPick(id)}
            className={cn(
              'rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-default',
              'border-border bg-background hover:bg-muted',
              revealOk && 'border-emerald-600 bg-emerald-50 text-emerald-900',
              isWrongPick && 'border-red-600 bg-red-50 text-red-900',
              locked && !revealOk && !isWrongPick && 'opacity-50',
            )}
          >
            {byId.get(id)?.name}
          </button>
        );
      })}
    </div>
  );
}
