import { Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The voice lab: hear the same Mandarin sentences in every OpenAI voice, switch on the ones worth
// keeping, and save. scripts/generate-sentence-audio.mjs then records the real sentences with them.
// Local only: the samples come from `npm run generate:sentence-audio -- --sample` into .voice-samples/,
// and the dev server both serves them and saves the choice (see vite.config.ts).

interface SampleIndex {
  model: string;
  sentences: { id: string; en: string; pinyin: string }[];
  voices: { name: string; ok: boolean; error?: string }[];
}

type Clip = { voice: string; id: string };
const urlOf = ({ voice, id }: Clip) => `/voice-samples/${voice}/${id}.mp3`;

// Plays clips one after another, and says which one is on.
function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Clip[]>([]);
  const [current, setCurrent] = useState<Clip | null>(null);

  const next = () => {
    const clip = queue.current.shift() ?? null;
    setCurrent(clip);
    if (!clip) return;
    const a = new Audio(urlOf(clip));
    audio.current = a;
    a.onended = () => setTimeout(next, 350);
    a.onerror = next;
    a.play().catch(next);
  };
  const play = (clips: Clip[]) => {
    audio.current?.pause();
    queue.current = [...clips];
    next();
  };
  const stop = () => {
    audio.current?.pause();
    queue.current = [];
    setCurrent(null);
  };
  return { current, play, stop };
}

export function VoiceLab() {
  const [index, setIndex] = useState<SampleIndex | null>(null);
  const [missing, setMissing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();

  useEffect(() => {
    fetch('/voice-samples/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setIndex)
      .catch(() => setMissing(true));
    fetch('/__voice-lab/choice')
      .then((r) => r.json())
      .then(({ voices }) => {
        setPicked(voices);
        setSaved(voices);
      })
      .catch(() => setError('The voice lab needs the dev server: run npm run dev and open /voice-lab.html.'));
  }, []);

  const save = async () => {
    setError(null);
    const res = await fetch('/__voice-lab/choice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voices: picked }),
    });
    const body = await res.json();
    if (res.ok) setSaved(body.voices);
    else setError(body.error ?? 'Could not save.');
  };

  const toggle = (voice: string) =>
    setPicked((p) => (p.includes(voice) ? p.filter((v) => v !== voice) : [...p, voice]));

  const ready = index?.voices.filter((v) => v.ok) ?? [];
  const unsaved = saved !== null && [...picked].sort().join() !== [...saved].sort().join();
  const isOn = (clip: Clip) => player.current?.voice === clip.voice && player.current.id === clip.id;

  return (
    <div className="mx-auto min-h-svh w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Voice lab</h1>
        <p className="text-sm text-muted-foreground">
          The same sentences in every voice. Switch on the ones that sound most natural. With more than one, the
          sentences take turns between them.
        </p>
      </header>

      {missing && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          No samples yet. Record them first:
          <pre className="mt-2 text-xs">npm run generate:sentence-audio -- --sample</pre>
        </div>
      )}
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {index && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Sentences</h2>
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {index.sentences.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div lang="zh-Latn-pinyin" className="text-sm font-medium">
                      {s.pinyin}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.en}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => player.play(ready.map((v) => ({ voice: v.name, id: s.id })))}
                  >
                    Every voice
                  </Button>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Voices · {index.model}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {index.voices.map((v) => {
                const on = picked.includes(v.name);
                const playingHere = player.current?.voice === v.name;
                return (
                  <div
                    key={v.name}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors',
                      on ? 'border-foreground' : 'border-border',
                      playingHere && 'bg-muted',
                      !v.ok && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{v.name}</span>
                      {v.ok ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`Use ${v.name}`}
                          onClick={() => toggle(v.name)}
                          className={cn(
                            'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                            on ? 'bg-foreground' : 'bg-muted-foreground/30',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform',
                              on && 'translate-x-4',
                            )}
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">didn't record</span>
                      )}
                    </div>
                    {v.ok ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            playingHere ? player.stop() : player.play(index.sentences.map((s) => ({ voice: v.name, id: s.id })))
                          }
                        >
                          {playingHere ? <Square /> : <Play />}
                          {playingHere ? 'Stop' : 'Play all'}
                        </Button>
                        {index.sentences.map((s, i) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => player.play([{ voice: v.name, id: s.id }])}
                            className={cn(
                              'size-8 rounded-md border border-border text-xs tabular-nums transition-colors hover:bg-muted',
                              isOn({ voice: v.name, id: s.id }) && 'border-foreground bg-foreground text-background',
                            )}
                            aria-label={`${v.name}: sentence ${i + 1}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{v.error}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                {picked.length === 0
                  ? 'Switch on at least one voice.'
                  : picked.length === 1
                    ? `Every sentence in ${picked[0]}.`
                    : `Sentences take turns between ${picked.join(', ')}.`}
              </p>
              <Button type="button" disabled={!picked.length || !unsaved} onClick={save}>
                {unsaved ? 'Save' : 'Saved'}
              </Button>
            </div>
            {saved?.length ? (
              <p className="text-xs text-muted-foreground">
                Then record the sentences: <code>npm run generate:sentence-audio</code>
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
