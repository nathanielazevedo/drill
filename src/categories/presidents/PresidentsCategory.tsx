import { useEffect } from 'react';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, Mode } from '@/lib/drill/types';
import { useDrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';
import creditsData from './data/credits.json';
import presidentsData from './data/presidents.json';

interface President {
  id: string;
  name: string;
  /** which presidency numbers they held; two for Cleveland and Trump */
  nums: number[];
  era: string;
  years: string;
  party: string;
  vp: string;
  state: string;
  fact: string;
}

interface Credit {
  source: string;
  license: string;
  author: string;
}

const presidents = presidentsData as President[];
const byPresident = new Map(presidents.map((p) => [p.id, p]));
const credits = creditsData as Record<string, Credit>;

const REGIONS = ['All', 'Founding', 'Antebellum', 'Civil War & Gilded Age', 'Progressive & World Wars', 'Cold War', 'Modern'] as const;

const targets: DrillTarget[] = presidents.map((p) => ({ id: p.id, name: p.name, region: p.era }));

const copy: DrillCopy = { noun: 'president', nounPlural: 'presidents', groupLabel: 'Era', wholeSet: 'All presidents' };

const modeDescription: Record<Mode, string> = {
  strict: 'In order from Washington. One miss ends the run.',
  free: 'In order from Washington. Misses show the answer and you carry on.',
  missed: 'Drills just the presidents you have gotten wrong.',
};

const portrait = (id: string) => `${import.meta.env.BASE_URL}presidents/${id}.jpg`;

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function PresidentCard({ target, outcome, nextId }: { target: DrillTarget; outcome: 'ok' | 'bad' | null; nextId?: string }) {
  const p = byPresident.get(target.id)!;
  const credit = credits[p.id];

  // Warm the cache with the next portrait so it's already there when Next is tapped.
  useEffect(() => {
    if (nextId) new Image().src = portrait(nextId);
  }, [nextId]);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border bg-muted/40 p-3 transition-colors',
        outcome === 'ok' && 'border-emerald-600',
        outcome === 'bad' && 'border-red-600',
      )}
    >
      <figure className="w-36 shrink-0">
        <img
          key={p.id}
          src={portrait(p.id)}
          alt="Portrait of the president in question"
          className="aspect-[3/4] w-full rounded-lg bg-muted object-cover object-top"
        />
        {credit && credit.license !== 'Public domain' && (
          <figcaption className="mt-1 text-[10px] leading-tight text-muted-foreground">
            <a href={credit.source} target="_blank" rel="noreferrer" className="underline">
              {credit.author || 'Photo'}
            </a>
            , {credit.license}
          </figcaption>
        )}
      </figure>
      <div>
        <div className="text-sm text-muted-foreground">Who was the</div>
        <div className="text-3xl font-semibold tracking-tight">{p.nums.map(ordinal).join(' & ')}</div>
        <div className="text-sm text-muted-foreground">president?</div>
      </div>
    </div>
  );
}

function PresidentFacts({ target }: { target: DrillTarget }) {
  const p = byPresident.get(target.id);
  if (!p) return null;

  const rows: [string, string][] = [
    ['In office', p.years],
    ['Party', p.party],
    ['Vice president', p.vp],
    ['Home state', p.state],
  ];

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-current/15 pt-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="opacity-70">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs">{p.fact}</p>
    </div>
  );
}

export function PresidentsCategory() {
  const game = useDrillGame({
    storageKey: 'shit-you-should-know.presidents.v1',
    targets,
    regions: REGIONS,
    hasFacts: true,
    ordered: true,
  });
  const nextId = game.run?.order[game.run.i + 1];

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} modeDescription={modeDescription} />
  ) : (
    <DrillScreen
      game={game}
      copy={copy}
      renderStage={(t, outcome) => <PresidentCard target={t} outcome={outcome} nextId={nextId} />}
      renderFacts={(t) => <PresidentFacts target={t} />}
    />
  );
}
