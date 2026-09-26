import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBackOverride } from '@/lib/back';
import { cn } from '@/lib/utils';
import { type Sentence, speak, stopSpeaking, unlockAudio } from './speech';

// Listening mode: hands-free. Each sentence plays, there's a pause to say it in English in your head,
// then the answer shows before moving on. Nothing is marked, so it doesn't touch streaks.

/** how long to think after the recording ends */
const THINK_MS = 4000;
/** how long the answer stays up before the next sentence */
const ANSWER_MS = 2500;

type Stage = 'playing' | 'thinking' | 'answer' | 'done';

interface ListeningScreenProps {
  /** the sentences to play, in order: the run's order, so blocks and Shuffle apply */
  sentences: Sentence[];
  /** what the run covers, for the header ('All 500', '101–200') */
  where: string;
  /** where to begin: a resumed flashcard run picks up where it left off */
  startAt?: number;
  onHome: () => void;
  onAgain: () => void;
}

export function ListeningScreen({ sentences, where, startAt = 0, onHome, onAgain }: ListeningScreenProps) {
  const [i, setI] = useState(Math.min(startAt, sentences.length - 1));
  const [stage, setStage] = useState<Stage>('playing');
  const [paused, setPaused] = useState(false);
  // bumped to hear the current sentence again from the start
  const [take, setTake] = useState(0);
  useBackOverride(onHome);

  const s = sentences[i];
  const next = () => {
    if (i + 1 < sentences.length) {
      setI(i + 1);
      setStage('playing');
    } else setStage('done');
  };

  // Each stage runs on its own and hands over to the next; pausing, skipping or leaving cancels it.
  useEffect(() => {
    if (paused || stage === 'done') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (stage === 'playing') {
      speak(s).then(() => {
        if (!cancelled) setStage('thinking');
      });
    } else if (stage === 'thinking') {
      timer = setTimeout(() => setStage('answer'), THINK_MS);
    } else {
      timer = setTimeout(next, ANSWER_MS);
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (stage === 'playing') stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `take` restarts the sentence
  }, [i, stage, paused, take]);

  useEffect(() => stopSpeaking, []);

  const replay = () => {
    unlockAudio();
    setPaused(false);
    setStage('playing');
    setTake((t) => t + 1);
  };
  // Starts over from the top. The new run can be in the same order (no Shuffle), so reset here too.
  const again = () => {
    setI(0);
    replay();
    onAgain();
  };

  if (stage === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/40 px-4 py-10 text-center">
          <div className="text-sm text-muted-foreground">Listened to</div>
          <div className="text-3xl font-semibold tracking-tight">
            {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={again}>
            Again
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onHome}>
            Back to menu
          </Button>
        </div>
      </div>
    );
  }

  const showAnswer = stage === 'answer';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{where}</div>
            <div className="text-xs text-muted-foreground">
              {i + 1} / {sentences.length}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Listening</span>
        </div>
        <Progress value={((i + 1) / sentences.length) * 100} className="h-1" />
      </div>

      <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border bg-muted/40 px-4 py-8 text-center">
        {showAnswer ? (
          <>
            <div className="text-3xl font-semibold tracking-tight text-balance">{s.en}</div>
            <div lang="zh-Latn-pinyin" className="border-t border-border pt-4 text-2xl font-medium text-balance">
              {s.pinyin}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {paused ? 'Paused' : stage === 'playing' ? 'Listen…' : 'What does it mean?'}
            </div>
            {/* the thinking time, filling up; restarts with each sentence */}
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div
                key={`${i}:${take}:${paused}`}
                className={cn('h-full w-0 bg-foreground/60', stage === 'thinking' && !paused && 'listening-think')}
                style={{ animationDuration: `${THINK_MS}ms` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" className="h-12" onClick={replay} aria-label="Hear it again">
          <RotateCcw />
          Replay
        </Button>
        <Button
          type="button"
          className="h-12"
          onClick={() => {
            unlockAudio();
            setPaused((p) => !p);
          }}
        >
          {paused ? <Play /> : <Pause />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12"
          onClick={() => {
            unlockAudio();
            setPaused(false);
            next();
          }}
        >
          <SkipForward />
          Next
        </Button>
      </div>
    </div>
  );
}
