// Records every Mandarin sentence (src/categories/mandarin-sentences/data/sentences.json) with
// OpenAI's text-to-speech, as an MP3 in public/audio/mandarin-sentences/, and lists what's been
// recorded in src/categories/mandarin-sentences/data/audio.json. The app plays these files in place
// of the browser's own voice; it never calls OpenAI itself.
//
// Run locally: npm run generate:sentence-audio
// Needs OPENAI_API_KEY, in .env.local (git ignores it) or the environment.
//
// Which voices to use is in scripts/sentence-voices.json, chosen by ear in the voice lab:
//   npm run generate:sentence-audio -- --sample    record a few test sentences in every voice
//   npm run dev, then open /voice-lab.html          listen, pick one voice or several, save
// With several voices, each sentence keeps to one of them (picked from its id), so the recordings
// alternate between speakers and adding sentences doesn't reshuffle the rest.
//
// Only sentences without a recording, whose Chinese has changed, or whose voice has changed are
// recorded, so it's cheap to rerun. Recordings of deleted sentences are removed.
//   --force           record everything again
//   --only id,id      just these sentences
//   --dry-run         list what would be recorded, without calling OpenAI
// OPENAI_TTS_MODEL overrides the model below.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const SENTENCES = 'src/categories/mandarin-sentences/data/sentences.json';
const MANIFEST = 'src/categories/mandarin-sentences/data/audio.json';
const VOICES_FILE = 'scripts/sentence-voices.json';
const OUT = 'public/audio/mandarin-sentences';
// outside public/, so a build never ships them; the dev server serves them to the voice lab
const SAMPLES = '.voice-samples';

const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
// Every voice worth trying. Any the model doesn't have just shows up as failed in the voice lab.
const ALL_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
// Test sentences for sampling: every tone, neutral tones, a bù that changes tone, a longer one.
const SAMPLE_IDS = [
  'ting-bu-dong',
  'zai-shuo',
  'duo-shao-qian',
  'zhende-ma',
  'ni-chifan-le-ma',
  'bu-haoyisi-wo-gao-cuo-le',
  'yidian-zhongwen',
  'yinwei-wo-dui-zhongguo-gan-xingqu',
];
// Only models that take instructions use this; it keeps the reading natural rather than announcer-like.
const INSTRUCTIONS =
  'Speak Standard Mandarin (Putonghua) the way a friendly native speaker from northern China talks in ' +
  'everyday conversation: natural rhythm and tones, relaxed, at a slightly slower than normal pace so a ' +
  'learner can follow. Read only the sentence, with no introduction.';
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => args.find((_, i) => args[i - 1] === name);
const force = flag('--force');
const dryRun = flag('--dry-run');
const only = option('--only') ? new Set(option('--only').split(',')) : null;

const sentences = JSON.parse(readFileSync(SENTENCES, 'utf8'));
const byId = new Map(sentences.map((s) => [s.id, s]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('Set OPENAI_API_KEY in .env.local (or the environment) first. Nothing was recorded.');
    process.exit(1);
  }
  return key;
}

// Rate limits and server hiccups get a few retries with backoff; anything else is thrown.
async function speech(text, voice) {
  const key = apiKey();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        voice,
        input: text,
        response_format: 'mp3',
        ...(MODEL.startsWith('tts-1') ? {} : { instructions: INSTRUCTIONS }),
      }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 5) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await sleep(1000 * 2 ** attempt);
  }
}

// Runs jobs a few at a time. Stops starting new ones after the first failure unless told to carry on.
async function runAll(jobs, { keepGoing = false } = {}) {
  const queue = [...jobs];
  const errors = [];
  const worker = async () => {
    while (queue.length && (keepGoing || !errors.length)) {
      const job = queue.shift();
      try {
        await job();
      } catch (err) {
        errors.push(err);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return errors;
}

// ---- sampling: the test sentences in every voice, for the voice lab ----

if (flag('--sample')) {
  const voices = option('--voices') ? option('--voices').split(',') : ALL_VOICES;
  const tests = SAMPLE_IDS.map((id) => {
    const s = byId.get(id);
    if (!s) throw new Error(`sample sentence ${id} isn't in ${SENTENCES}`);
    return s;
  });
  const indexFile = `${SAMPLES}/index.json`;
  const prev = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : { voices: [] };
  const status = new Map(prev.voices.map((v) => [v.name, v]));
  const fileOf = (voice, id) => `${SAMPLES}/${voice}/${id}.mp3`;
  const todo = voices.flatMap((voice) => tests.filter((s) => force || !existsSync(fileOf(voice, s.id))).map((s) => ({ voice, s })));

  if (dryRun) {
    console.log(`${todo.length} samples to record (${voices.length} voices × ${tests.length} sentences, minus any already there).`);
    process.exit(0);
  }
  if (todo.length) apiKey();
  console.log(`Recording ${todo.length} samples with ${MODEL}…`);
  const failedVoices = new Map();
  await runAll(
    todo.map(({ voice, s }) => async () => {
      if (failedVoices.has(voice)) return; // one error is enough to know a voice doesn't work
      try {
        const audio = await speech(s.zh, voice);
        mkdirSync(`${SAMPLES}/${voice}`, { recursive: true });
        writeFileSync(fileOf(voice, s.id), audio);
      } catch (err) {
        failedVoices.set(voice, err.message);
      }
    }),
    { keepGoing: true },
  );
  for (const voice of voices) {
    const ok = tests.every((s) => existsSync(fileOf(voice, s.id)));
    status.set(voice, { name: voice, ok, ...(ok ? {} : { error: failedVoices.get(voice) ?? 'not recorded' }) });
  }
  writeFileSync(
    indexFile,
    JSON.stringify(
      {
        model: MODEL,
        sentences: tests.map((s) => ({ id: s.id, en: s.en, pinyin: s.pinyin })),
        voices: [...status.values()],
      },
      null,
      2,
    ) + '\n',
  );
  for (const [voice, error] of failedVoices) console.log(`  ${voice} failed: ${error}`);
  const okCount = [...status.values()].filter((v) => v.ok).length;
  console.log(`${okCount} voices ready. Run npm run dev and open /voice-lab.html to listen and pick.`);
  process.exit(0);
}

// ---- recording the sentences with the chosen voices ----

const chosen = existsSync(VOICES_FILE) ? JSON.parse(readFileSync(VOICES_FILE, 'utf8')).voices : null;
const voices = chosen?.length ? chosen : ['coral'];

// The same sentence always gets the same voice from a given set.
function voiceFor(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return voices[(h >>> 0) % voices.length];
}

// id → what it was recorded from, so a changed sentence or voice gets recorded again
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const recorded = manifest.recorded ?? {};

mkdirSync(OUT, { recursive: true });
const fileOf = (id) => `${OUT}/${id}.mp3`;

// Tidy up after deleted sentences.
if (!dryRun) {
  for (const f of readdirSync(OUT)) {
    const id = f.replace(/\.mp3$/, '');
    if (!byId.has(id)) {
      rmSync(`${OUT}/${f}`);
      console.log(`removed ${f} (sentence gone)`);
    }
  }
}
for (const id of Object.keys(recorded)) if (!byId.has(id) || !existsSync(fileOf(id))) delete recorded[id];

const todo = sentences.filter((s) => {
  if (only && !only.has(s.id)) return false;
  const r = recorded[s.id];
  return force || !r || r.zh !== s.zh || r.voice !== voiceFor(s.id) || r.model !== MODEL;
});

function saveManifest() {
  // in sentence order, so the diff stays readable
  const ordered = Object.fromEntries(sentences.filter((s) => recorded[s.id]).map((s) => [s.id, recorded[s.id]]));
  writeFileSync(MANIFEST, JSON.stringify({ recorded: ordered }, null, 2) + '\n');
}

console.log(`Voices: ${voices.join(', ')}${chosen ? '' : ' (none chosen yet, so the default)'}`);
if (!todo.length) {
  if (!dryRun) saveManifest();
  console.log(`All ${sentences.length} sentences are recorded.`);
  process.exit(0);
}
if (dryRun) {
  for (const s of todo) console.log(`${s.id}  ${voiceFor(s.id)}  ${s.zh}`);
  console.log(`${todo.length} to record.`);
  process.exit(0);
}
apiKey();

console.log(`Recording ${todo.length} of ${sentences.length} sentences with ${MODEL}…`);
let done = 0;
const errors = await runAll(
  todo.map((s) => async () => {
    const voice = voiceFor(s.id);
    writeFileSync(fileOf(s.id), await speech(s.zh, voice));
    recorded[s.id] = { zh: s.zh, voice, model: MODEL };
    done++;
    if (done % 25 === 0 || done === todo.length) {
      saveManifest(); // keep progress if the run is stopped partway
      console.log(`  ${done}/${todo.length}`);
    }
  }),
);
saveManifest();
if (errors.length) {
  console.error(`Stopped after ${done}: ${errors[0].message}`);
  process.exit(1);
}
console.log(`Done: ${done} recorded, in ${OUT}/.`);
