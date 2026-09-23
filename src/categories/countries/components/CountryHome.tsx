import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MODES, REGIONS, bestKey, regionPool } from '../lib/logic';
import type { Mode, WorldData } from '../lib/types';
import type { useCountriesGame } from '../lib/useGame';
import { MissedDialog } from './MissedDialog';

interface CountryHomeProps {
  world: WorldData;
  game: ReturnType<typeof useCountriesGame>;
}

export function CountryHome({ world, game }: CountryHomeProps) {
  const { store, byId, setRegion, startRun, resume, clearMissed, resetAll } = game;
  const [missedOpen, setMissedOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const missedCount = Object.keys(store.missed).length;
  const total = regionPool(world, store.region).length;
  const bestStrict = store.best[bestKey('strict', store.region)];
  const bestFree = store.best[bestKey('free', store.region)];

  const modeMeta: Record<Mode, string | null> = {
    strict: bestStrict ? `Best ${bestStrict}/${total}` : null,
    free: bestFree != null ? `Best ${bestFree}%` : null,
    missed: missedCount ? `${missedCount} to drill` : null,
  };

  const modeDescription: Record<Mode, string> = {
    strict: 'One miss ends the run. Tracks your best streak.',
    free: 'Misses show the answer and you carry on. Tracks your best score.',
    missed: 'Drills just the countries you have gotten wrong.',
  };

  return (
    <div className="flex flex-col gap-6">
      {store.run && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between gap-3 py-2">
            <div>
              <div className="text-sm font-medium">Continue {MODES[store.run.mode].name}</div>
              <div className="text-xs text-muted-foreground">
                {store.run.i} of {store.run.order.length} · {store.run.mode === 'missed' ? 'missed countries' : store.run.region === 'All' ? 'the world' : store.run.region}
              </div>
            </div>
            <Button type="button" size="sm" onClick={resume}>
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Region</div>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setRegion(region)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                region === store.region ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted',
              )}
            >
              {region === 'All' ? 'World' : region}
              <span className="ml-1.5 text-xs opacity-60">{regionPool(world, region).length}</span>
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
        onDrill={() => {
          setMissedOpen(false);
          startRun('missed');
        }}
        onClear={clearMissed}
      />
    </div>
  );
}
