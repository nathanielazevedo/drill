import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome, ToggleRow } from '@/components/drill/GroupHome';
import { Button } from '@/components/ui/button';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, RunState } from '@/lib/drill/types';
import { choicesFor, storageKeyFor } from '@/lib/drill/logic';
import type { Phase } from '@/lib/drill/useGame';
import { useDrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';
import sentencesData from './data/sentences.json';
import wordsData from './data/words.json';

// The sentences come in groups of ten. Before each group, its new words are asked like the Mandarin
// category (pinyin, pick the meaning); then its sentences are flashcards you mark yourself: see the
// English, say it in Mandarin, reveal, then Got it or Missed. Honest marking is the whole deal, so a
// Missed ends the run like any wrong answer.

interface Sentence {
  id: string;
  en: string;
  /** what's shown: pinyin, with yī and bù marked in the tone they're said in (bú yào, yíxià) */
  pinyin: string;
  /** never shown; only there so the device's Mandarin voice can read the sentence properly */
  zh: string;
  /** its words, in order, from words.json */
  words: string[];
}

interface Word {
  id: string;
  /** dictionary form (bù, yī), except set words said with the changed tone (yíxià, yìzhí) */
  pinyin: string;
  en: string;
}

const sentences = sentencesData as Sentence[];
const words = wordsData as Word[];
const sentenceById = new Map(sentences.map((s) => [s.id, s]));

// Word cards get their own ids: some words are whole sentences too (xièxie, duì).
const WORD = 'w:';
const wordById = new Map(words.map((w) => [WORD + w.id, w]));

// Sentences are taught in groups of ten; the home screen picks them in blocks of fifty.
const GROUP_SIZE = 10;
const BLOCK_SIZE = 50;
const rangeOf = (i: number, size: number) => {
  const first = Math.floor(i / size) * size + 1;
  return `${first}–${Math.min(first + size - 1, sentences.length)}`;
};
const REGIONS = ['All', ...new Set(sentences.map((_, i) => rangeOf(i, BLOCK_SIZE)))];

// A run goes group by group: the group's new words, then its ten sentences. A word is taught once,
// before the first group that uses it, with that first sentence kept as its example.
const exampleOf = new Map<string, Sentence>();
const groupOfTarget = new Map<string, string>();
const targets: DrillTarget[] = [];
for (let g = 0; g < sentences.length; g += GROUP_SIZE) {
  const group = sentences.slice(g, g + GROUP_SIZE);
  const region = rangeOf(g, BLOCK_SIZE);
  const add = (t: DrillTarget) => {
    targets.push(t);
    groupOfTarget.set(t.id, rangeOf(g, GROUP_SIZE));
  };
  for (const s of group) {
    for (const w of s.words) {
      const id = WORD + w;
      if (exampleOf.has(id)) continue;
      exampleOf.set(id, s);
      add({ id, name: wordById.get(id)!.en, region });
    }
  }
  // The answer shown when a run ends on a sentence is its pinyin.
  for (const s of group) add({ id: s.id, name: s.pinyin, region });
}

const isWord = (id: string) => id.startsWith(WORD);

// Shuffle mixes up the words, and the sentences, within each group of ten, but keeps the groups and
// the words-then-sentences order.
const shuffleBlock = (t: DrillTarget) => `${groupOfTarget.get(t.id)}:${isWord(t.id) ? 'words' : 'sentences'}`;

// A word's options are other words, from its own block of fifty first. Never one that's spelled the same
// (zài "again" and zài "at"), since the pinyin alone couldn't tell them apart.
const wordTargets = targets.filter((t) => isWord(t.id));
const targetById = new Map(targets.map((t) => [t.id, t]));
function drawChoices(id: string): string[] {
  const pinyin = wordById.get(id)?.pinyin;
  const pool = wordTargets.filter((t) => t.id === id || wordById.get(t.id)!.pinyin !== pinyin);
  return choicesFor(pool, targetById, id);
}

// Two ways to drill, each with its own saved run and best streaks, so a streak through bare
// sentences isn't compared with one padded out by word cards. sentences.json is in order of
// usefulness: the ones you'd reach for first come first.
interface Mode {
  storageKey: string;
  targets: DrillTarget[];
  copy: DrillCopy;
  runDescription: string;
  shuffledDescription: string;
}

const wholeSet = `All ${sentences.length}`;

const WITH_WORDS: Mode = {
  storageKey: storageKeyFor('mandarin-sentences'),
  targets,
  copy: { noun: 'card', nounPlural: 'cards', groupLabel: 'Sentences', wholeSet },
  runDescription: 'Ten sentences at a time, most useful first, each ten after its new words. A miss ends the run.',
  shuffledDescription: 'Ten sentences at a time, each ten after its new words, mixed up within each. A miss ends the run.',
};

const SENTENCES_ONLY: Mode = {
  storageKey: storageKeyFor('mandarin-sentences-only'),
  targets: targets.filter((t) => !isWord(t.id)),
  copy: { noun: 'sentence', nounPlural: 'sentences', groupLabel: 'Sentences', wholeSet },
  runDescription: 'Just the sentences, most useful first. A miss ends the run.',
  shuffledDescription: 'Just the sentences, mixed up ten at a time. A miss ends the run.',
};

/** a pick that can't match any sentence, so the drill counts it as wrong */
const MISSED = '';

function mandarinVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => /^zh[-_]CN$/i.test(v.lang));
}

// Only with a real Mandarin voice: an English voice reading pinyin would teach the wrong sounds.
function speak(s: Sentence) {
  const voice = mandarinVoice();
  if (!voice) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(s.zh);
  u.lang = 'zh-CN';
  u.voice = voice;
  u.rate = 0.85;
  synth.speak(u);
}

// An on/off preference on this device, like reading cards aloud. It lives in localStorage beside
// the drill's own save rather than in it.
function usePref(name: string, fallback: boolean): [boolean, (on: boolean) => void] {
  const key = `${storageKeyFor('mandarin-sentences')}.${name}`;
  const [on, setOn] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === 'on';
    } catch {
      return fallback;
    }
  });
  const set = (next: boolean) => {
    setOn(next);
    try {
      localStorage.setItem(key, next ? 'on' : 'off');
    } catch {
      // storage blocked: the setting just won't stick
    }
  };
  return [on, set];
}

// Voices load late in some browsers, so check again once they arrive.
function useHasVoice(): boolean {
  const [has, setHas] = useState(() => !!mandarinVoice());
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setHas(!!mandarinVoice());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return has;
}

function SentenceCard({
  sentence,
  revealed,
  outcome,
  hasVoice,
}: {
  sentence: Sentence;
  revealed: boolean;
  outcome: 'ok' | 'bad' | null;
  hasVoice: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border bg-muted/40 px-4 py-8 text-center transition-colors',
        outcome === 'ok' && 'border-emerald-600',
        outcome === 'bad' && 'border-red-600',
      )}
    >
      <div className="text-sm text-muted-foreground">Say it in Mandarin</div>
      <div className="text-3xl font-semibold tracking-tight text-balance">{sentence.en}</div>
      {revealed && (
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <span lang="zh-Latn-pinyin" className="text-2xl font-medium text-balance">
            {sentence.pinyin}
          </span>
          {hasVoice && (
            <button
              type="button"
              onClick={() => speak(sentence)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Hear it again"
            >
              <Volume2 className="size-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WordCard({ word, example, outcome }: { word: Word; example: Sentence; outcome: 'ok' | 'bad' | null }) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/40 px-4 py-8 text-center transition-colors',
        outcome === 'ok' && 'border-emerald-600',
        outcome === 'bad' && 'border-red-600',
      )}
    >
      <div className="text-sm text-muted-foreground">New word · what does it mean?</div>
      <div lang="zh-Latn-pinyin" className="text-5xl font-semibold tracking-tight">
        {word.pinyin}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        as in <span lang="zh-Latn-pinyin">{example.pinyin}</span>
      </div>
    </div>
  );
}

function Controls({
  phase,
  revealed,
  onReveal,
  onGotIt,
  onMissed,
}: {
  phase: Phase;
  revealed: boolean;
  onReveal: () => void;
  onGotIt: () => void;
  onMissed: () => void;
}) {
  if (!revealed) {
    return (
      <Button type="button" className="h-12 text-base" onClick={onReveal}>
        Reveal
      </Button>
    );
  }
  const locked = phase !== 'asking';
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={locked}
        onClick={onMissed}
        className="h-12 rounded-lg border border-border bg-background text-base font-medium transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-900 disabled:cursor-default disabled:opacity-50"
      >
        Missed
      </button>
      <button
        type="button"
        disabled={locked}
        onClick={onGotIt}
        className={cn(
          'h-12 rounded-lg border border-border bg-background text-base font-medium transition-colors hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-900 disabled:cursor-default',
          phase === 'ok' && 'border-emerald-600 bg-emerald-50 text-emerald-900',
        )}
      >
        Got it
      </button>
    </div>
  );
}

export function MandarinSentencesCategory() {
  const [sentencesOnly, setSentencesOnly] = usePref('sentences-only', false);
  // A fresh drill per mode, since each has its own targets and save.
  return (
    <SentencesDrill
      key={sentencesOnly ? 'sentences-only' : 'with-words'}
      mode={sentencesOnly ? SENTENCES_ONLY : WITH_WORDS}
      sentencesOnly={sentencesOnly}
      setSentencesOnly={setSentencesOnly}
    />
  );
}

function SentencesDrill({
  mode,
  sentencesOnly,
  setSentencesOnly,
}: {
  mode: Mode;
  sentencesOnly: boolean;
  setSentencesOnly: (on: boolean) => void;
}) {
  const game = useDrillGame({
    storageKey: mode.storageKey,
    targets: mode.targets,
    regions: REGIONS,
    ordered: true,
    shuffleBlock,
    drawChoices,
  });
  const hasVoice = useHasVoice();
  const [autoplay, setAutoplay] = usePref('autoplay', true);

  // Which question has been revealed. Tied to the run's own order as well as the position, so the
  // first sentence of a new run starts hidden even though it's the same sentence at the same spot.
  const [revealedAt, setRevealedAt] = useState<{ order: string[]; i: number } | null>(null);
  const run: RunState | null = game.run;
  const answered = game.phase !== 'asking';
  const revealed = answered || (!!run && revealedAt?.order === run.order && revealedAt.i === run.i);

  const reveal = () => {
    if (!run || !game.target) return;
    setRevealedAt({ order: run.order, i: run.i });
    if (autoplay) speak(sentenceById.get(game.target.id)!);
  };

  // On a sentence: Space reveals; then → for Got it, ← for Missed.
  useEffect(() => {
    if (game.screen !== 'game' || game.phase !== 'asking' || !game.targetId || isWord(game.targetId)) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (!revealed && (ev.key === ' ' || ev.key === 'Enter')) {
        ev.preventDefault();
        reveal();
      } else if (revealed && ev.key === 'ArrowRight') game.pick(game.targetId!);
      else if (revealed && ev.key === 'ArrowLeft') game.pick(MISSED);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return game.screen === 'home' ? (
    <GroupHome
      game={game}
      copy={mode.copy}
      runDescription={game.store.shuffle ? mode.shuffledDescription : mode.runDescription}
      settings={
        <>
          <ToggleRow
            label="Sentences only"
            on={sentencesOnly}
            onChange={setSentencesOnly}
            hint="Skip the word cards. Keeps its own best streaks."
          />
          <ToggleRow
            label="Play audio"
            on={autoplay}
            onChange={setAutoplay}
            hint={
              hasVoice
                ? 'Read each sentence aloud when you reveal it.'
                : "Read each sentence aloud when you reveal it. This device has no Mandarin voice, so there's nothing to play."
            }
          />
        </>
      }
    />
  ) : (
    <DrillScreen
      game={game}
      copy={mode.copy}
      renderStage={(t, outcome) =>
        isWord(t.id) ? (
          <WordCard word={wordById.get(t.id)!} example={exampleOf.get(t.id)!} outcome={outcome} />
        ) : (
          <SentenceCard sentence={sentenceById.get(t.id)!} revealed={revealed} outcome={outcome} hasVoice={hasVoice} />
        )
      }
      // words keep the usual multiple choice
      renderControls={(t) => (isWord(t.id) ? null : (
        <Controls
          phase={game.phase}
          revealed={revealed}
          onReveal={reveal}
          onGotIt={() => game.pick(t.id)}
          onMissed={() => game.pick(MISSED)}
        />
      ))}
    />
  );
}
