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

// One player for every recording. Browsers (Safari above all) only let a sound start from a tap,
// but a player that has been started from a tap may go on playing new sounds by itself. So it's
// reused, and unlockAudio() starts it during the tap that begins hands-free playback.
let player: HTMLAudioElement | null = null;
const audioPlayer = () => (player ??= new Audio());
let unlocked = false;
// Settles whatever's playing when something else starts or it's stopped, so nothing waits forever.
let settle: (() => void) | null = null;

// A twentieth of a second of silence, as a WAV: just enough to start the player during a tap.
function silence(): string {
  const samples = 400; // 8 kHz, 8-bit mono
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit silence sits at the midpoint
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

/**
 * Call from inside a tap, before anything plays by itself (listening mode's Start, Resume...), so
 * the sentences that follow are allowed to play without one.
 */
export function unlockAudio() {
  if (!unlocked) {
    unlocked = true;
    const a = audioPlayer();
    // whatever was waiting on the player is settled by stopSpeaking, not by this silence ending
    a.onended = null;
    a.onerror = null;
    a.src = silence();
    a.play().catch((err: DOMException) => {
      if (err.name === 'NotAllowedError') unlocked = false; // wasn't a tap after all; try again next time
    });
  }
  // the device voice (for sentences without a recording) has the same rule on iPhones
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && !window.speechSynthesis.speaking) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  }
}

function mandarinVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => /^zh[-_]CN$/i.test(v.lang));
}

export function stopSpeaking() {
  player?.pause();
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
      const audio = audioPlayer();
      audio.onended = done;
      audio.onerror = done;
      audio.src = `${import.meta.env.BASE_URL}audio/mandarin-sentences/${s.id}.mp3`;
      // refused if nothing has unlocked playback yet; the speaker button still works
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
