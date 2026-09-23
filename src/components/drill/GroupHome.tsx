import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DrillCopy } from '@/lib/drill/copy';
import { MODES, bestKey, regionKey, regionPool } from '@/lib/drill/logic';
import type { Mode } from '@/lib/drill/types';
import type { DrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';
import { MissedDialog } from './MissedDialog';

interface GroupHomeProps {
  game: DrillGame;
  copy: DrillCopy;
  modeDescription: Record<Mode, string>;
}

export function GroupHome({ game, copy, modeDescription }: GroupHomeProps) {
  const { store, byId, regions, toggleRegion, startRun, resume, clearMissed, resetAll } = game;
  const [missedOpen, setMissedOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const targets = [...byId.values()];
  const countIn = (region: string) => regionPool(targets, region === 'All' ? [] : [region]).length;
  const isSelected = (region: string) => (region === 'All' ? !store.regions.length : store.regions.includes(region));

  const missedCount = Object.keys(store.missed).length;
  const selection = regionKey(store.regions, regions);
  const total = regionPool(targets, store.regions).length;
  const bestStrict = store.best[bestKey('strict', selection)];
  const bestFree = store.best[bestKey('free', selection)];

  const modeMeta: Record<Mode, string | null> = {
    strict: bestStrict ? `Best ${bestStrict}/${total}` : null,
    free: bestFree != null ? `Best ${bestFree}%` : null,
    missed: missedCount ? `${missedCount} to drill` : null,
  };

  return (
    <div className="flex flex-col gap-6">
      {store.run && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between gap-3 py-2">
            <div>
              <div className="text-sm font-medium">Continue {MODES[store.run.mode].name}</div>
              <div className="text-xs text-muted-foreground">
                {store.run.i} of {store.run.order.length} ·{' '}
                {store.run.mode === 'missed' ? `missed ${copy.nounPlural}` : store.run.region === 'All' ? copy.wholeSet : store.run.region}
              </div>
            </div>
            <Button type="button" size="sm" onClick={resume}>
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>{copy.groupLabel}</span>
          <span className="normal-case tracking-normal">
            {total} {total === 1 ? copy.noun : copy.nounPlural}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <button
              key={region}
              type="button"
              aria-pressed={isSelected(region)}
              onClick={() => toggleRegion(region)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                isSelected(region) ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted',
              )}
            >
              {region === 'All' ? copy.wholeSet : region}
              <span className="ml-1.5 text-xs opacity-60">{countIn(region)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {(Object.keys(MODES) as Mode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={mode === 'missed' && !missedCount}
            onClick={() => startRun(mode)}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <div>
              <div className="font-medium">{MODES[mode].name}</div>
              <div className="text-xs text-muted-foreground">{modeDescription[mode]}</div>
            </div>
            {modeMeta[mode] && <div className="shrink-0 text-xs font-medium text-muted-foreground">{modeMeta[mode]}</div>}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => setMissedOpen(true)}>
          Review missed{missedCount ? ` (${missedCount})` : ''}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            if (!resetArmed) {
              setResetArmed(true);
              setTimeout(() => setResetArmed(false), 2500);
              return;
            }
            resetAll();
            setResetArmed(false);
          }}
        >
          {resetArmed ? 'Tap again to erase everything' : 'Erase progress'}
        </Button>
      </div>

      <MissedDialog
        open={missedOpen}
        onOpenChange={setMissedOpen}
        store={store}
        byId={byId}
        copy={copy}
        onDrill={() => {
          setMissedOpen(false);
          startRun('missed');
        }}
        onClear={clearMissed}
      />
    </div>
  );
}
