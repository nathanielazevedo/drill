import worldData from '@/data/world.json';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, Mode, WorldData } from '@/lib/drill/types';
import { useDrillGame } from '@/lib/drill/useGame';
import { CountryFacts } from './CountryFacts';

const world = worldData as unknown as WorldData;

const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;

const targets: DrillTarget[] = world.countries.map((c) => ({ id: c.id, name: c.name, region: c.region, f: c.f, a: c.a }));

const copy: DrillCopy = { noun: 'country', nounPlural: 'countries', groupLabel: 'Region', wholeSet: 'World' };

const modeDescription: Record<Mode, string> = {
  strict: 'One miss ends the run. Tracks your best streak.',
  free: 'Misses show the answer and you carry on. Tracks your best score.',
  missed: 'Drills just the countries you have gotten wrong.',
};

export function CountriesCategory() {
  const game = useDrillGame({ storageKey: 'shit-you-should-know.countries.v1', targets, regions: REGIONS, hasFacts: true });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} modeDescription={modeDescription} />
  ) : (
    <DrillScreen basemap={world} game={game} copy={copy} renderFacts={(t) => <CountryFacts target={t} />} />
  );
}
