import usData from './data/us.json';
import factsData from './data/facts.json';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, WorldData } from '@/lib/drill/types';
import { storageKeyFor } from '@/lib/drill/logic';
import { useDrillGame } from '@/lib/drill/useGame';

const us = usData as unknown as WorldData;

interface Facts {
  abbr: string;
  capital: string;
  /** largest city by population */
  city: string;
  admitted: number;
  /** order of admission, counting the original 13 by date of ratifying the Constitution */
  order: number;
  nickname: string;
  fact: string;
}

const facts = factsData as Record<string, Facts>;

const REGIONS = ['All', 'Northeast', 'Midwest', 'South', 'West'] as const;

const targets: DrillTarget[] = us.countries.map((s) => ({ id: s.id, name: s.name, region: s.region, f: s.f, a: s.a }));

const copy: DrillCopy = { noun: 'state', nounPlural: 'states', groupLabel: 'Region', wholeSet: 'All states' };

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function StateFacts({ target }: { target: DrillTarget }) {
  const f = facts[target.id];
  if (!f) return null;

  const rows: [string, string][] = [
    ['Capital', f.capital],
    ['Largest city', f.city],
    ['Statehood', `${f.admitted} (${ordinal(f.order)})`],
    ['Nickname', f.nickname],
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs opacity-80">{f.abbr}</span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="opacity-70">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs">{f.fact}</p>
    </div>
  );
}

export function UsStatesCategory() {
  const game = useDrillGame({ storageKey: storageKeyFor('us-states'), targets, regions: REGIONS, hasFacts: true });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} />
  ) : (
    <DrillScreen basemap={us} game={game} copy={copy} renderFacts={(t) => <StateFacts target={t} />} />
  );
}
