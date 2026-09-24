import { Volume2 } from 'lucide-react';
import factsData from './data/facts.json';
import type { DrillTarget } from '@/lib/drill/types';

interface Facts {
  /** English phonetic respelling, stressed syllable in caps */
  say: string;
  founded: string;
  gov: string;
  lang: string;
}

const facts = factsData as Record<string, Facts>;

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Uses the browser's built-in text-to-speech, so there's no audio to ship; voices vary by device.
function speak(text: string) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function CountryFacts({ target }: { target: DrillTarget }) {
  const f = facts[target.id];
  if (!f) return null;

  const rows: [string, string][] = [
    ['Founded', f.founded],
    ['Government', f.gov],
    ['Language', f.lang],
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs opacity-80">{f.say}</span>
        {canSpeak && (
          <button
            type="button"
            onClick={() => speak(target.name)}
            className="rounded-full p-1 transition-colors hover:bg-current/10"
            aria-label={`Hear how to say ${target.name}`}
          >
            <Volume2 className="size-4" />
          </button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="opacity-70">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
