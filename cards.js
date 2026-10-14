// Renders front/back card markup from window.COCKTAILS and fits text to each card.
// Shared by index.html (preview) and the print layout.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- Units: IBA data is in ml, the supplement is in US oz. Either can be shown in the other.
// oz display rounds to the nearest 1/8 oz (thirds and 1 tsp = 5 ml recognised); ml display rounds to 2.5 ml.
let UNIT = 'oz';
function setUnit(u) { UNIT = u; }

const FRAC = { '⅛': 1 / 8, '¼': 1 / 4, '⅓': 1 / 3, '⅜': 3 / 8, '½': 1 / 2, '⅝': 5 / 8, '⅔': 2 / 3, '¾': 3 / 4, '⅞': 7 / 8, '⅙': 1 / 6 };
const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];

function parseOz(s) {
  // "1½" | "1 ½" | "¾" | "1.5" | "2"
  const m = s.match(/^(\d+)?\s*([⅛¼⅓⅜½⅝⅔¾⅞⅙])?(?:\.(\d+))?$/);
  if (!m) return NaN;
  let v = m[1] ? parseInt(m[1], 10) : 0;
  if (m[2]) v += FRAC[m[2]];
  if (m[3]) v += parseFloat('0.' + m[3]);
  return v;
}

function fmtOz(x) {
  if (Math.abs(x - 1 / 6) < 0.02) return '1 tsp';
  const whole = Math.floor(x + 1e-9);
  const frac = x - whole;
  let f = '';
  if (Math.abs(frac - 1 / 3) < 0.03) f = '⅓';
  else if (Math.abs(frac - 2 / 3) < 0.03) f = '⅔';
  else {
    const e = Math.round(frac * 8);
    if (e === 8) return `${whole + 1} oz`;
    f = EIGHTHS[e];
  }
  if (!whole && !f) return '0 oz';
  return `${whole || ''}${f} oz`.trim();
}

function fmtMl(x) {
  const ml = x * 30;
  const r = ml >= 60 ? Math.round(ml / 5) * 5 : Math.round(ml / 2.5) * 2.5;
  return `${r} ml`;
}

function convertQty(text) {
  if (UNIT === 'oz') {
    return text.replace(/(\d+(?:\.\d+)?)\s*ml\b/gi, (_, n) => fmtOz(parseFloat(n) / 30));
  }
  text = text.replace(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*oz\b/g, (_, a, b) => `${fmtMl(parseFloat(a)).replace(' ml', '')}–${fmtMl(parseFloat(b))}`);
  return text.replace(/((?:\d+\s*)?[⅛¼⅓⅜½⅝⅔¾⅞⅙]|\d+(?:\.\d+)?)\s*oz\b/g, (_, q) => {
    const v = parseOz(q.replace(/\s+/g, ''));
    return isNaN(v) ? _ : fmtMl(v);
  });
}

function paragraphs(text, cls = '') {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const isNote = /^(note|\*)/i.test(line);
      return `<p class="${isNote ? 'note' : cls}">${esc(line)}</p>`;
    })
    .join('');
}

function frontHTML(c) {
  const n = c.ingredients.length;
  const twoCol = (n >= 7 ? ' two-col' : '') + (n >= 5 ? ' two-col-wide' : '');
  const photo = c.image ? `<img class="photo" src="${c.image}" alt="">` : '';
  const rank = c.di_rank ? ` · DI #${c.di_rank}` : '';
  return `
  <div class="card front${c.image ? '' : ' no-img'}" data-slug="${c.slug}">
    <div class="punch"></div>
    ${photo}
    <div class="text">
      <h1 class="name">${esc(c.name)}</h1>
      <h4>Ingredients</h4>
      <ul class="ingredients${twoCol}">${c.ingredients.map((i) => `<li>${esc(convertQty(i))}</li>`).join('')}</ul>
      ${c.glass ? `<h4>Glass</h4><p>${esc(c.glass)}</p>` : ''}
      <h4>Method</h4>
      ${paragraphs(convertQty(c.method))}
      <h4>Garnish</h4>
      ${paragraphs(c.garnish)}
      <div class="footer"><span>${esc(c.category_label)}</span><span class="tier tier-${c.tier}">${esc(c.tier_label)}${rank}</span><span>${esc(c.set_label)}</span></div>
    </div>
  </div>`;
}

function refsHTML(c) {
  if (!c.refs || !c.refs.length) return '';
  return `<div class="refs"><div class="refs-title">Reference</div>${c.refs.map((r) => `<div>${esc(r.label)}</div>`).join('')}</div>`;
}

function backHTML(c) {
  const qr = c.qr
    ? `<div class="qr">${c.qr}</div><div class="qr-label">Scan for the IBA video</div>`
    : '';
  return `
  <div class="card back" data-slug="${c.slug}">
    <div class="punch"></div>
    <h1 class="name">${esc(c.name)}</h1>
    <div class="category">${esc(c.category_label)}</div>
    ${qr}
    ${refsHTML(c)}
  </div>`;
}

// Shrink the text column's font size until nothing overflows the card.
function fitCards(root = document) {
  const MIN = 5.25; // pt
  for (const text of root.querySelectorAll('.card.front .text')) {
    text.style.fontSize = '';
    let size = parseFloat(getComputedStyle(text).fontSize) * 0.75; // px -> pt
    text.style.fontSize = size + 'pt';
    while (text.scrollHeight > text.clientHeight + 0.5 && size > MIN) {
      size -= 0.25;
      text.style.fontSize = size + 'pt';
    }
    text.dataset.pt = size.toFixed(2);
    if (text.scrollHeight > text.clientHeight + 0.5) text.closest('.card').classList.add('overflow');
  }
}

window.Cards = { frontHTML, backHTML, fitCards, setUnit };
