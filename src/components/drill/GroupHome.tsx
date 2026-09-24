import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type DrillCopy, pluralize } from '@/lib/drill/copy';
import { answeredCount, bestKey, regionKey, regionPool } from '@/lib/drill/logic';
import type { DrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';

interface GroupHomeProps {
  game: DrillGame;
  copy: DrillCopy;
  /** the rules line under the Start button */
  runDescription?: string;
}

function ToggleRow({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted"
    >
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-foreground' : 'bg-muted-foreground/30')}>
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform',
            on && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}

export function GroupHome({ game, copy, runDescription = 'One miss ends the run.' }: GroupHomeProps) {
  const { store, byId, regions, hasFacts, setShowFacts, setShuffle, toggleRegion, startRun, resume, resetAll } = game;
  const [resetArmed, setResetArmed] = useState(false);

  const targets = [...byId.values()];
  const countIn = (region: string) => regionPool(targets, region === 'All' ? [] : [region]).length;
  const isSelected = (region: string) => (region === 'All' ? !store.regions.length : store.regions.includes(region));

  const total = regionPool(targets, store.regions).length;
  const best = store.best[bestKey(regionKey(store.regions, regions))];

  return (
    <div className="flex flex-col gap-6">
      {store.run && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between gap-3 py-2">
            <div>
              <div className="text-sm font-medium">Continue</div>
              <div className="text-xs text-muted-foreground">
                {answeredCount(store.run)} of {store.run.order.length} ·{' '}
                {store.run.region === 'All' ? copy.wholeSet : store.run.region}
              </div>
            </div>
            <Button type="button" size="sm" onClick={resume}>
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{copy.groupLabel}</div>
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

      <div className="divide-y divide-border rounded-lg border border-border">
        {hasFacts && (
          <ToggleRow
            label="Show facts"
            on={store.showFacts}
            onChange={setShowFacts}
            hint={
              store.showFacts
                ? `Learn about each ${copy.noun} after you answer, then tap Next.`
                : 'Off: right answers move on by themselves, for speedrunning.'
            }
          />
        )}
        <ToggleRow
          label="Shuffle"
          on={store.shuffle}
          onChange={setShuffle}
          hint={store.shuffle ? 'A new random order every run.' : 'Off: the same order every run, so you can learn it.'}
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* with a run to resume, Resume is the main action and this steps back */}
        <Button type="button" variant={store.run ? 'outline' : 'default'} className="h-11 text-base" onClick={startRun}>
          Start · {pluralize(total, copy)}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {runDescription}
          {best ? ` Best ${best}/${total}.` : ''}
        </p>
      </div>

      <div className="flex items-center justify-end">
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
    </div>
  );
}
