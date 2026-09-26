import { useEffect, useState } from 'react';
import audioData from './data/audio.json';

export interface Sentence {
  id: string;
  en: string;
  /** what's shown: pinyin, with yī and bù marked in the tone they're said in (bú yào, yíxià) */
  pinyin: string;
  /** never shown; there for the recordings, and so the device's Mandarin voice reads it properly */
  zh: string;
}

// Recordings made by scripts/generate-sentence-audio.mjs: sentence id → the Chinese it recorded (and
// the voice). A recording only counts while the sentence still reads the same.
const recorded = (audioData as { recorded: Record<string, { zh: string; voice: string }> }).recorded;
export const hasRecording = (s: Sentence) => recorded[s.id]?.zh === s.zh;

let playing: HTMLAudioElement | null = null;
// Settles whatever's playing when something else starts or it's stopped, so nothing waits forever.
let settle: (() => void) | null = null;

function mandarinVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => /^zh[-_]CN$/i.test(v.lang));
}

export function stopSpeaking() {
  playing?.pause();
  playing = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  settle?.();
  settle = null;
}

/**
 * Says the sentence: its recording when it has one, otherwise the device's Mandarin voice (never an
 * English voice reading pinyin, which would teach the wrong sounds). Resolves when it's finished,
 * stopped, or couldn't play at all.
 */
export function speak(s: Sentence): Promise<void> {
  stopSpeaking();
  return new Promise((resolve) => {
    settle = resolve;
    const done = () => {
      if (settle === resolve) settle = null;
      resolve();
    };
    if (hasRecording(s)) {
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/mandarin-sentences/${s.id}.mp3`);
      playing = audio;
      audio.onended = done;
      audio.onerror = done;
      // autoplay can be refused before the page has had a tap; the speaker button still works
      audio.play().catch(done);
      return;
    }
    const voice = mandarinVoice();
    if (!voice) return done();
    const u = new SpeechSynthesisUtterance(s.zh);
    u.lang = 'zh-CN';
    u.voice = voice;
    u.rate = 0.85;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

// Voices load late in some browsers, so check again once they arrive.
export function useHasVoice(): boolean {
  const [has, setHas] = useState(() => !!mandarinVoice());
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setHas(!!mandarinVoice());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return has;
}
