import { Volume2 } from 'lucide-react';
import chinaData from './data/china.json';
import factsData from './data/facts.json';
import { DrillScreen } from '@/components/drill/DrillScreen';
import { GroupHome } from '@/components/drill/GroupHome';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, WorldData } from '@/lib/drill/types';
import { useDrillGame } from '@/lib/drill/useGame';

const china = chinaData as unknown as WorldData;

interface Facts {
  zh: string;
  pinyin: string;
  type: string;
  /** '—' for the municipalities and SARs, which are cities themselves */
  capital: string;
  fact: string;
}

const facts = factsData as Record<string, Facts>;

const REGIONS = ['All', 'North', 'Northeast', 'East', 'Central & South', 'Southwest', 'Northwest'] as const;

const targets: DrillTarget[] = china.countries.map((p) => ({ id: p.id, name: p.name, region: p.region, f: p.f, a: p.a }));

const copy: DrillCopy = { noun: 'province', nounPlural: 'provinces', groupLabel: 'Region', wholeSet: 'All of China' };

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Says the Chinese name with a Mandarin voice when the device has one, otherwise the English name.
function speak(target: DrillTarget, zh: string) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = synth.getVoices().find((v) => v.lang === 'zh-CN' || v.lang === 'zh_CN');
  const u = new SpeechSynthesisUtterance(voice ? zh : target.name);
  u.lang = voice ? 'zh-CN' : 'en-US';
  u.rate = 0.8;
  if (voice) u.voice = voice;
  synth.speak(u);
}

function ProvinceFacts({ target }: { target: DrillTarget }) {
  const f = facts[target.id];
  if (!f) return null;

  const rows: [string, string][] = [['Type', f.type]];
  if (f.capital !== '—') rows.push(['Capital', f.capital]);

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-current/15 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{f.zh}</span>
        <span className="text-xs opacity-80">{f.pinyin}</span>
        {canSpeak && (
          <button
            type="button"
            onClick={() => speak(target, f.zh)}
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
      <p className="text-xs">{f.fact}</p>
    </div>
  );
}

export function ChinaCategory() {
  const game = useDrillGame({ storageKey: 'shit-you-should-know.china.v1', targets, regions: REGIONS, hasFacts: true });

  return game.screen === 'home' ? (
    <GroupHome game={game} copy={copy} />
  ) : (
    <DrillScreen basemap={china} game={game} copy={copy} renderFacts={(t) => <ProvinceFacts target={t} />} />
  );
}
