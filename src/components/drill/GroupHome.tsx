import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  const [startArmed, setStartArmed] = useState(false);

  const targets = [...byId.values()];
  const countIn = (region: string) => regionPool(targets, region === 'All' ? [] : [region]).length;
  const isSelected = (region: string) => (region === 'All' ? !store.regions.length : store.regions.includes(region));

  const total = regionPool(targets, store.regions).length;
  const selection = regionKey(store.regions, regions);
  const best = store.best[bestKey(selection)] || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Your best streak for the selected regions: the number the whole game is about, so it leads. */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Best streak · {selection === 'All' ? copy.wholeSet : selection}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tabular-nums tracking-tight">{best}</span>
          <span className="text-lg text-muted-foreground tabular-nums">/ {total}</span>
          {best === total && total > 0 && <span className="ml-2 text-sm font-medium text-emerald-700">Flawless</span>}
        </div>
        <Progress value={total ? (best / total) * 100 : 0} className="h-1.5" />
      </div>

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
            hint={`Learn about each ${copy.noun} before moving on.`}
          />
        )}
        <ToggleRow
          label="Shuffle"
          on={store.shuffle}
          onChange={setShuffle}
          hint="A new order every run."
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* With a run to resume, Resume is the main action and this steps back. Starting over would
            drop the saved run, so it takes a second tap. */}
        <Button
          type="button"
          variant={store.run ? 'outline' : 'default'}
          className="h-11 text-base"
          onClick={() => {
            if (store.run && !startArmed) {
              setStartArmed(true);
              setTimeout(() => setStartArmed(false), 2500);
              return;
            }
            setStartArmed(false);
            startRun();
          }}
        >
          {startArmed ? 'Tap again to drop your saved run' : `${store.run ? 'Start new run' : 'Start'} · ${pluralize(total, copy)}`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {runDescription}
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
          {resetArmed ? 'Tap again to erase your progress' : 'Erase progress'}
        </Button>
      </div>
    </div>
  );
}
