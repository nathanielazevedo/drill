import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget } from '@/lib/drill/types';
import { storageKeyFor } from '@/lib/drill/logic';
import { useDrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';
import wordsData from './data/words.json';

interface Word {
  id: string;
  pinyin: string;
  /** the English meaning, which is also the answer to pick */
  en: string;
  type: string;
  /** an example sentence in pinyin, and its translation */
  ex: string;
  exEn: string;
  note?: string;
}

const words = wordsData as Word[];
const byWord = new Map(words.map((w) => [w.id, w]));

const REGIONS = ['All', 'People', 'Verbs', 'Describing', 'Things & time', 'Questions', 'Little words'] as const;

// No two words share a pinyin spelling or a meaning, so the pinyin alone always has one right answer.
const targets: DrillTarget[] = words.map((w) => ({ id: w.id, name: w.en, region: w.type }));

const copy: DrillCopy = { noun: 'word', nounPlural: 'words', groupLabel: 'Type', wholeSet: 'All words' };

function WordCard({ target, outcome }: { target: DrillTarget; outcome: 'ok' | 'bad' | null }) {
  const w = byWord.get(target.id)!;
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border bg-muted/40 px-4 py-10 text-center transition-colors',
        outcome === 'ok' && 'border-emerald-600',
        outcome === 'bad' && 'border-red-600',
      )}
    >
      <div className="text-sm text-muted-foreground">What does this mean?</div>
      <div lang="zh-Latn-pinyin" className="text-5xl font-semibold tracking-tight">
        {w.pinyin}
      </div>
    </div>
  );
}

function WordFacts({ target }: { target: DrillTarget }) {
  const w = byWord.get(target.id);
  if (!w) return null;
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div>
        <div lang="zh-Latn-pinyin" className="text-sm font-medium">
          {w.ex}
        </div>
        <div className="opacity-70">{w.exEn}</div>
      </div>
      {w.note && <p>{w.note}</p>}
    </div>
  );
}

export function MandarinCategory() {
  const game = useDrillGame({ storageKey: storageKeyFor('mandarin'), targets, regions: REGIONS, hasFacts: true });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} />
  ) : (
    <DrillScreen
      game={game}
      copy={copy}
      renderStage={(t, outcome) => <WordCard target={t} outcome={outcome} />}
      renderFacts={(t) => <WordFacts target={t} />}
    />
  );
}
