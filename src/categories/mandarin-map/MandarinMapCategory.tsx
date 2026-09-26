import { useMemo } from 'react';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import { type TargetOutline, WorldMap } from '@/components/drill/WorldMap';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, RunState, WorldData } from '@/lib/drill/types';
import { storageKeyFor } from '@/lib/drill/logic';
import { useDrillGame } from '@/lib/drill/useGame';
import blocksData from './data/blocks.json';
import mapData from './data/map.json';

// The building blocks (rén, dà, diàn...) are the map's territories, grouped into a continent per
// theme. A word is two blocks put together: it's asked by lighting up both, joined by a bridge.
// map.json is drawn from blocks.json by scripts/build-mandarin-map.mjs.

interface Piece {
  id: string;
  pinyin: string;
  en: string;
  theme: string;
  note?: string;
}

interface Word extends Piece {
  parts: [string, string];
}

interface MandarinMap extends WorldData {
  /** per word: the bridge between its blocks, and the focus frame and area covering both */
  words: { id: string; bridge: string; f: [number, number, number, number]; a: number }[];
}

const { themes, pieces, words } = blocksData as { themes: string[]; pieces: Piece[]; words: Word[] };
const map = mapData as unknown as MandarinMap;

const pieceById = new Map(pieces.map((p) => [p.id, p]));
const wordById = new Map(words.map((w) => [w.id, w]));
const shapeById = new Map(map.countries.map((c) => [c.id, c]));

const REGIONS = ['All', ...themes] as const;

// Blocks come first, most useful first. Each word follows as soon as both of its blocks have been
// asked, so dàrén comes straight after rén and dà.
const learningOrder: (Piece | Word)[] = [];
{
  const seen = new Set<string>();
  const pending = [...words];
  for (const p of pieces) {
    learningOrder.push(p);
    seen.add(p.id);
    for (let i = 0; i < pending.length; ) {
      if (pending[i].parts.every((id) => seen.has(id))) learningOrder.push(...pending.splice(i, 1));
      else i++;
    }
  }
}

const geoById = new Map<string, { f: [number, number, number, number]; a: number }>([
  ...map.countries.map((c) => [c.id, { f: c.f, a: c.a }] as const),
  ...map.words.map((w) => [w.id, { f: w.f, a: w.a }] as const),
]);

const targets: DrillTarget[] = learningOrder.map((x) => ({ id: x.id, name: x.en, region: x.theme, ...geoById.get(x.id) }));

// A word is drawn as both of its blocks plus the bridge between them.
const outlines: TargetOutline[] = map.words.map((w) => {
  const [a, b] = wordById.get(w.id)!.parts;
  return { id: w.id, d: shapeById.get(a)!.d + shapeById.get(b)!.d + w.bridge };
});

// Each word answered right leaves its bridge on the map for the rest of the run.
const trails: TargetOutline[] = map.words.map((w) => ({ id: w.id, d: w.bridge }));

const copy: DrillCopy = { noun: 'word', nounPlural: 'words', groupLabel: 'Continent', wholeSet: 'The whole map' };

const runDescription = 'Blocks first, then each word once you know both its parts. One miss ends the run.';

/** the words each block helps build */
const buildsById = new Map<string, Word[]>(pieces.map((p) => [p.id, words.filter((w) => w.parts.includes(p.id))]));

/** other blocks that sound exactly the same */
function soundAlikes(p: Piece): Piece[] {
  return pieces.filter((o) => o.id !== p.id && o.pinyin === p.pinyin);
}

function Stage({ target, outcome, run }: { target: DrillTarget; outcome: 'ok' | 'bad' | null; run: RunState | null }) {
  const x = pieceById.get(target.id) ?? wordById.get(target.id)!;
  // one object per target, so the map only flies when the question changes
  const targetGeo = useMemo(() => (target.f ? { name: target.name, f: target.f, a: target.a ?? 0 } : null), [target]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-center gap-2 text-center">
        <span className="text-sm text-muted-foreground">What does</span>
        <span lang="zh-Latn-pinyin" className="text-3xl font-semibold tracking-tight">
          {x.pinyin}
        </span>
        <span className="text-sm text-muted-foreground">mean?</span>
      </div>
      <WorldMap world={map} outlines={outlines} trails={trails} targetId={target.id} targetGeo={targetGeo} outcome={outcome} run={run} />
    </div>
  );
}

function BlockFacts({ target }: { target: DrillTarget }) {
  const word = wordById.get(target.id);
  if (word) {
    const [a, b] = word.parts.map((id) => pieceById.get(id)!);
    return (
      <div className="flex flex-col gap-2 text-xs">
        <div className="text-sm">
          <span lang="zh-Latn-pinyin" className="font-medium">{a.pinyin}</span> <span className="opacity-70">{a.en}</span>
          <span className="mx-1.5 opacity-50">+</span>
          <span lang="zh-Latn-pinyin" className="font-medium">{b.pinyin}</span> <span className="opacity-70">{b.en}</span>
        </div>
        {word.note && <p>{word.note}</p>}
      </div>
    );
  }

  const p = pieceById.get(target.id);
  if (!p) return null;
  const builds = buildsById.get(p.id) ?? [];
  const alikes = soundAlikes(p);
  return (
    <div className="flex flex-col gap-2 text-xs">
      {p.note && <p>{p.note}</p>}
      {builds.length > 0 && (
        <div>
          <div className="mb-1 opacity-70">Builds</div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {builds.map((w) => (
              <li key={w.id}>
                <span lang="zh-Latn-pinyin" className="font-medium">{w.pinyin}</span> <span className="opacity-70">{w.en}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {alikes.map((o) => (
        <p key={o.id}>
          Sounds just like <span lang="zh-Latn-pinyin" className="font-medium">{o.pinyin}</span>, {o.en}, over in {o.theme}. Only where
          it sits tells them apart.
        </p>
      ))}
    </div>
  );
}

export function MandarinMapCategory() {
  const game = useDrillGame({
    storageKey: storageKeyFor('mandarin-map'),
    targets,
    regions: REGIONS,
    hasFacts: true,
    ordered: true,
  });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} runDescription={game.store.shuffle ? undefined : runDescription} />
  ) : (
    <DrillScreen
      game={game}
      copy={copy}
      renderStage={(t, outcome) => <Stage target={t} outcome={outcome} run={game.run} />}
      renderFacts={(t) => <BlockFacts target={t} />}
    />
  );
}
