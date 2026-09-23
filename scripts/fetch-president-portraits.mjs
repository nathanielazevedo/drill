// Downloads a portrait for every president (src/categories/presidents/data/presidents.json) from
// the lead image of their Wikipedia article, as a small JPEG in public/presidents/, and records
// each image's source, author and license in src/categories/presidents/data/credits.json.
// Run: npm run fetch:portraits
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const WIDTH = 360;
const OUT = 'public/presidents';
const presidents = JSON.parse(readFileSync('src/categories/presidents/data/presidents.json', 'utf8'));
const UA = 'shit-you-should-know/0.1 (portrait fetch script)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia rate-limits bursts, so space requests out and back off on 429s.
async function get(url) {
  for (let attempt = 0; ; attempt++) {
    await sleep(500);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res;
    if (res.status !== 429 || attempt >= 5) throw new Error(`${res.status} ${url}`);
    await sleep(2000 * 2 ** attempt);
  }
}

async function api(params) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return (await get(url)).json();
}

mkdirSync(OUT, { recursive: true });
const credits = {};

for (const p of presidents) {
  const page = (await api({ action: 'query', prop: 'pageimages', piprop: 'name', titles: p.wiki, redirects: '1' })).query.pages[0];
  if (!page?.pageimage) throw new Error(`no lead image for ${p.wiki}`);
  const file = `File:${page.pageimage}`;

  const info = (
    await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH), titles: file })
  ).query.pages[0].imageinfo[0];
  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? 'unknown';
  const author = (meta.Artist?.value ?? '').replace(/<[^>]*>/g, '').trim();

  const img = await get(info.thumburl);
  writeFileSync(`${OUT}/${p.id}.jpg`, Buffer.from(await img.arrayBuffer()));

  credits[p.id] = { file, source: info.descriptionurl, license, author };
  console.log(`${p.id.padEnd(24)} ${license}`);
}

writeFileSync('src/categories/presidents/data/credits.json', JSON.stringify(credits, null, 2) + '\n');
