// Builds data.js from cocktails.json (scraped IBA list) + supplement.json (non-IBA drinks)
// + popularity.json (Drinks International ranking and tier rules). Also embeds an inline
// SVG QR code for every drink that has a video. Usage: node build.mjs  (after scrape.mjs)
import { readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const iba = JSON.parse(await readFile('cocktails.json', 'utf8'));
const supplement = JSON.parse(await readFile('supplement.json', 'utf8'));
const pop = JSON.parse(await readFile('popularity.json', 'utf8'));

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Drinks International rank lookup, by normalised name, with aliases for IBA spellings.
const rank = new Map();
pop.di_2026.forEach((name, i) => {
  rank.set(norm(name), i + 1);
  if (pop.aliases[name]) rank.set(norm(pop.aliases[name]), i + 1);
});
const usCore = new Set(pop.us_staples_core.map(norm));
const eventCommon = new Set(pop.event_common.map(norm));

function tierFor(name, category) {
  const n = norm(name);
  const r = rank.get(n);
  if ((r && r <= 15) || usCore.has(n) || category === 'simple-drinks' || category === 'zero-proof') return 'core';
  if ((r && r <= 50) || eventCommon.has(n)) return 'common';
  return 'rare';
}

const TIER_LABEL = { core: 'Core', common: 'Common', rare: 'Rare' };

const all = [
  ...iba.map((c) => ({ ...c, set: 'iba', set_label: 'IBA Official Recipe' })),
  ...supplement.drinks.map((d) => ({
    name: d.name,
    slug: norm(d.name).replace(/ /g, '-'),
    category: d.category,
    category_label: supplement._categories[d.category] + (d.region ? ` · ${d.region}` : ''),
    glass: d.glass,
    ingredients: d.ingredients,
    method: d.method,
    garnish: d.garnish,
    video: '',
    image: '',
    refs: d.refs || [],
    deviation: d.deviation || '',
    set: 'supplement',
    set_label: 'Standard Spec · not IBA',
  })),
];

for (const c of all) {
  c.di_rank = rank.get(norm(c.name)) || null;
  c.tier = tierFor(c.name, c.category);
  c.tier_label = TIER_LABEL[c.tier];
  c.qr = c.video ? await QRCode.toString(c.video, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 }) : '';
}

// Report DI names that matched nothing, so a spelling drift in the IBA list is visible.
const matched = new Set(all.filter((c) => c.di_rank).map((c) => c.di_rank));
const unmatched = pop.di_2026.filter((_, i) => !matched.has(i + 1));

await writeFile('data.js', `window.COCKTAILS = ${JSON.stringify(all)};\n`);

// SOURCES.md: one entry per non-IBA drink with its references and stated deviations.
const lines = ['# Sources for non-IBA cards', '', supplement._about, '', '## Pour standard', '', supplement._pour_standard, '',
  ...supplement._pour_refs.map((r) => `- ${r.label}: ${r.url}`), '',
  `Popularity tiers: ${pop._tiers}`, '', `Drinks International ranking: ${pop._source} ${pop._url}`, '', `US volume staples: ${pop._us_staples_source}`, ''];
for (const d of supplement.drinks) {
  lines.push(`## ${d.name}`, '');
  for (const r of d.refs) lines.push(`- ${r.label}: ${r.url}`);
  lines.push(`- Deviation from reference: ${d.deviation}`, '');
}
await writeFile('SOURCES.md', lines.join('\n'));
const counts = all.reduce((a, c) => ((a[c.tier] = (a[c.tier] || 0) + 1), a), {});
console.log(`data.js: ${all.length} drinks (${iba.length} IBA + ${supplement.drinks.length} supplement), tiers`, counts);
console.log('DI 2026 entries not matched to any card:', unmatched);
