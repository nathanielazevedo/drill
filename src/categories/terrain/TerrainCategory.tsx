import worldData from '@/data/world.json';
import featuresData from './data/features.json';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, Mode, WorldData } from '@/lib/drill/types';
import { useDrillGame } from '@/lib/drill/useGame';

const world = worldData as unknown as WorldData;

const TYPE_LABEL: Record<string, string> = {
  ocean: 'Oceans',
  lake: 'Lakes',
  mountain: 'Mountain Ranges',
  desert: 'Deserts',
};

const REGIONS = ['All', 'Oceans', 'Lakes', 'Mountain Ranges', 'Deserts'] as const;

interface RawFeature {
  id: string;
  name: string;
  type: string;
  f: [number, number, number, number];
  a: number;
}

const targets: DrillTarget[] = (featuresData as RawFeature[]).map((t) => ({
  id: t.id,
  name: t.name,
  region: TYPE_LABEL[t.type] ?? t.type,
  f: t.f,
  a: t.a,
}));

const copy: DrillCopy = { noun: 'feature', nounPlural: 'features', groupLabel: 'Type', wholeSet: 'Everything' };

const modeDescription: Record<Mode, string> = {
  strict: 'One miss ends the run. Tracks your best streak.',
  free: 'Misses show the answer and you carry on. Tracks your best score.',
  missed: 'Drills just the features you have gotten wrong.',
};

export function TerrainCategory() {
  const game = useDrillGame({ storageKey: 'shit-you-should-know.terrain.v1', targets, regions: REGIONS });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} modeDescription={modeDescription} />
  ) : (
    <DrillScreen basemap={world} game={game} copy={copy} />
  );
}
