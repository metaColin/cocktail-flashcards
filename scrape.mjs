// Scrapes every IBA official cocktail page into cocktails.json and downloads photos into img/.
// Usage: node scrape.mjs
import { load } from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://iba-world.com';
const CATEGORY_LABELS = {
  'the-unforgettables': 'The Unforgettables',
  'contemporary-classics': 'Contemporary Classics',
  'new-era-drinks': 'New Era Drinks',
};

const clean = (s) => s.replace(/\u00a0/g, ' ').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (iba-flashcards personal scraper)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

async function listCocktailUrls() {
  const xml = await getText(`${BASE}/wp-sitemap-posts-iba-cocktail-1.xml`);
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}

function extract(html, url) {
  const $ = load(html);
  const main = $('main').length ? $('main') : $('body');
  const name = main.find('h1').first().text().trim();
  const slug = url.replace(/\/$/, '').split('/').pop();

  // Each section is an h4 (Ingredients / Method / Garnish) inside an Elementor widget;
  // the content is the following sibling widgets up to the next h4.
  const sections = {};
  main.find('h4').each((_, h) => {
    const key = $(h).text().trim().toLowerCase();
    const widget = $(h).closest('.elementor-widget');
    const start = widget.length ? widget : $(h).parent();
    const parts = [];
    let n = start.next();
    let guard = 0;
    while (n.length && guard++ < 6 && !n.is('h4') && !n.find('h4').length) {
      const t = clean(n.text());
      if (t) parts.push(t);
      n = n.next();
    }
    sections[key] = parts.join('\n');
  });

  const imageUrl = main.find('img').map((_, i) => $(i).attr('src') || '').get().find((s) => /iba-cocktail-/.test(s)) || '';
  const m = imageUrl.match(/iba-cocktail-(the-unforgettables|contemporary-classics|new-era(?:-drinks)?)-/);
  const category = m ? (m[1].startsWith('new-era') ? 'new-era-drinks' : m[1]) : '';
  const video = $('a[href*="youtube.com/watch"], a[href*="youtu.be/"], iframe[src*="youtube"]')
    .map((_, v) => $(v).attr('href') || $(v).attr('src')).get()[0] || '';

  const ext = (imageUrl.match(/\.(webp|jpe?g|png)(\?|$)/i) || [, 'webp'])[1].toLowerCase();
  return {
    name,
    slug,
    category,
    category_label: CATEGORY_LABELS[category] || '',
    ingredients: (sections.ingredients || '').split('\n').filter(Boolean),
    method: sections.method || '',
    garnish: sections.garnish || '',
    video,
    image: `img/${slug}.${ext}`,
    image_url: imageUrl,
    source: url,
  };
}

async function downloadImage(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

const urls = await listCocktailUrls();
console.log(`${urls.length} cocktail pages`);
await mkdir('img', { recursive: true });

const cocktails = [];
for (const url of urls) {
  const c = extract(await getText(url), url);
  await downloadImage(c.image_url, c.image);
  cocktails.push(c);
  process.stdout.write(`${c.name} [${c.category}]\n`);
}

cocktails.sort((a, b) => a.name.localeCompare(b.name));
await writeFile('cocktails.json', JSON.stringify(cocktails, null, 2) + '\n');

const problems = cocktails.filter((c) => !c.name || !c.category || !c.ingredients.length || !c.method || !c.garnish || !c.video);
const counts = cocktails.reduce((a, c) => ((a[c.category] = (a[c.category] || 0) + 1), a), {});
console.log('\ncategories:', counts);
console.log('incomplete records:', problems.map((p) => p.slug));
