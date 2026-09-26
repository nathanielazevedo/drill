import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome, ToggleRow } from '@/components/drill/GroupHome';
import { Button } from '@/components/ui/button';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, RunState } from '@/lib/drill/types';
import { storageKeyFor } from '@/lib/drill/logic';
import type { Phase } from '@/lib/drill/useGame';
import { useDrillGame } from '@/lib/drill/useGame';
import { cn } from '@/lib/utils';
import audioData from './data/audio.json';
import sentencesData from './data/sentences.json';

// Flashcards you mark yourself: see the English, say it in Mandarin, reveal, then Got it or Missed.
// Honest marking is the whole deal, so a Missed ends the run like any wrong answer.

interface Sentence {
  id: string;
  en: string;
  /** what's shown: pinyin, with yī and bù marked in the tone they're said in (bú yào, yíxià) */
  pinyin: string;
  /** never shown; there for the recordings, and so the device's Mandarin voice reads it properly */
  zh: string;
}

const sentences = sentencesData as Sentence[];
const sentenceById = new Map(sentences.map((s) => [s.id, s]));

// The home screen picks sentences in blocks of a hundred.
const BLOCK_SIZE = 100;
const blockOf = (i: number) => {
  const first = Math.floor(i / BLOCK_SIZE) * BLOCK_SIZE + 1;
  return `${first}–${Math.min(first + BLOCK_SIZE - 1, sentences.length)}`;
};
const REGIONS = ['All', ...new Set(sentences.map((_, i) => blockOf(i)))];

// The answer shown when a run ends is the pinyin.
const targets: DrillTarget[] = sentences.map((s, i) => ({ id: s.id, name: s.pinyin, region: blockOf(i) }));

const copy: DrillCopy = { noun: 'sentence', nounPlural: 'sentences', groupLabel: 'Sentences', wholeSet: `All ${sentences.length}` };

// sentences.json is in order of usefulness: the ones you'd reach for first come first.
const runDescription = 'Most useful first. Say it out loud, then check. A miss ends the run.';

const STORAGE_KEY = storageKeyFor('mandarin-sentences');

// Word cards used to come before each ten sentences, with a Sentences only switch that saved its
// progress separately. That separate save is exactly today's drill, so it becomes the save; one
// that counted word cards doesn't compare with sentence-only streaks, so it goes.
try {
  const ONLY_KEY = storageKeyFor('mandarin-sentences-only');
  const DONE_KEY = `${STORAGE_KEY}.no-word-cards`;
  if (!localStorage.getItem(DONE_KEY)) {
    const onlySave = localStorage.getItem(ONLY_KEY);
    if (onlySave) localStorage.setItem(STORAGE_KEY, onlySave);
    else localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONLY_KEY);
    localStorage.removeItem(`${STORAGE_KEY}.sentences-only`);
    localStorage.setItem(DONE_KEY, '1');
  }
} catch {
  // storage blocked: nothing saved to move
}

/** a pick that can't match any sentence, so the drill counts it as wrong */
const MISSED = '';

// Recordings made by scripts/generate-sentence-audio.mjs: sentence id → the Chinese it recorded (and
// the voice). A recording only counts while the sentence still reads the same.
const recorded = (audioData as { recorded: Record<string, { zh: string; voice: string }> }).recorded;
const hasRecording = (s: Sentence) => recorded[s.id]?.zh === s.zh;
const anyRecordings = sentences.some(hasRecording);
let playing: HTMLAudioElement | null = null;

function mandarinVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => /^zh[-_]CN$/i.test(v.lang));
}

// Only with a real Mandarin voice: an English voice reading pinyin would teach the wrong sounds.
function speak(s: Sentence) {
  playing?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  if (hasRecording(s)) {
    playing = new Audio(`${import.meta.env.BASE_URL}audio/mandarin-sentences/${s.id}.mp3`);
    // autoplay can be refused before the page has had a tap; the speaker button still works
    playing.play().catch(() => {});
    return;
  }
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
          {(hasVoice || hasRecording(sentence)) && (
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
  const game = useDrillGame({ storageKey: STORAGE_KEY, targets, regions: REGIONS, ordered: true });
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

  // Space reveals; then → for Got it, ← for Missed.
  useEffect(() => {
    if (game.screen !== 'game' || game.phase !== 'asking' || !game.targetId) return;
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
      copy={copy}
      runDescription={game.store.shuffle ? 'Say it out loud, then check. A miss ends the run.' : runDescription}
      settings={
        <ToggleRow
          label="Play audio"
          on={autoplay}
          onChange={setAutoplay}
          hint={
            hasVoice || anyRecordings
              ? 'Read each sentence aloud when you reveal it.'
              : "Read each sentence aloud when you reveal it. This device has no Mandarin voice, so there's nothing to play."
          }
        />
      }
    />
  ) : (
    <DrillScreen
      game={game}
      copy={copy}
      renderStage={(t, outcome) => (
        <SentenceCard sentence={sentenceById.get(t.id)!} revealed={revealed} outcome={outcome} hasVoice={hasVoice} />
      )}
      renderControls={(t) => (
        <Controls
          phase={game.phase}
          revealed={revealed}
          onReveal={reveal}
          onGotIt={() => game.pick(t.id)}
          onMissed={() => game.pick(MISSED)}
        />
      )}
    />
  );
}
