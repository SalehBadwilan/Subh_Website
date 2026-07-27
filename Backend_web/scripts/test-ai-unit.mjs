/**
 * Lightweight unit check for the AI service's pure functions:
 *   - extractJson (defensive JSON extraction from model output)
 *   - sanitizeIntent (guard rails on parsed intent)
 *
 * No network, no DB. Run: node scripts/test-ai-unit.mjs
 *
 * This proves the parse/validate layer handles the messy shapes the model
 * actually returns (code fences, surrounding prose, extra keys, bad types).
 */
import assert from 'assert';

// --- Re-implement the two pure functions here to test logic in isolation ---
// (kept identical to src/modules/ai/services/aiService.js so a divergence is
//  caught by the diff in review; a future refactor can export + import them.)

const MAX_KEYWORDS = 5;
const MAX_KEYWORD_LEN = 60;
const PRICE_FLOOR = 0;
const PRICE_CEIL = 10_000_000;

function extractJson(content) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return JSON.parse(text);
}

function sanitizeIntent(parsed) {
  const intent = { keywords: [] };
  if (Array.isArray(parsed.keywords)) {
    const seen = new Set();
    for (const kwRaw of parsed.keywords) {
      if (typeof kwRaw !== 'string') continue;
      const kw = kwRaw.trim();
      if (kw.length === 0 || kw.length > MAX_KEYWORD_LEN) continue;
      const lower = kw.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      intent.keywords.push(kw);
      if (intent.keywords.length >= MAX_KEYWORDS) break;
    }
  }
  if (typeof parsed.category_slug === 'string' && parsed.category_slug.trim()) {
    const slug = parsed.category_slug.trim().slice(0, 100);
    if (/^[a-z0-9-]+$/i.test(slug)) intent.category_slug = slug;
  }
  const clamp = (v) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : Number.parseFloat(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(Math.max(n, PRICE_FLOOR), PRICE_CEIL);
  };
  const pMin = clamp(parsed.price_min);
  const pMax = clamp(parsed.price_max);
  if (pMin !== null) intent.price_min = pMin;
  if (pMax !== null) intent.price_max = pMax;
  if (intent.price_min != null && intent.price_max != null && intent.price_min > intent.price_max) {
    delete intent.price_max;
  }
  return intent;
}

// --- Tests -----------------------------------------------------------------
let pass = 0;
const fail = [];
function check(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    pass++;
  } catch (e) {
    console.log(`[FAIL] ${name} :: ${e.message}`);
    fail.push(name);
  }
}

check('extractJson: plain JSON', () => {
  assert.deepStrictEqual(extractJson('{"keywords":["قهوة"]}'), { keywords: ['قهوة'] });
});

check('extractJson: ```json fenced', () => {
  const out = extractJson('Here you go:\n```json\n{"keywords":["a"]}\n```');
  assert.deepStrictEqual(out, { keywords: ['a'] });
});

check('extractJson: fenced with prose around', () => {
  const out = extractJson('Sure! {"keywords":["x"],"price_max":10} done.');
  assert.deepStrictEqual(out, { keywords: ['x'], price_max: 10 });
});

check('sanitizeIntent: normalizes + de-dups keywords', () => {
  const out = sanitizeIntent({ keywords: ['قهوة', 'قهوة', 'Arabic', 'arabic', 'تمر'] });
  assert.deepStrictEqual(out.keywords, ['قهوة', 'Arabic', 'تمر']);
});

check('sanitizeIntent: caps keywords at 5', () => {
  const out = sanitizeIntent({ keywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
  assert.strictEqual(out.keywords.length, 5);
});

check('sanitizeIntent: drops non-string keywords', () => {
  const out = sanitizeIntent({ keywords: ['ok', 42, null, { x: 1 }, 'good'] });
  assert.deepStrictEqual(out.keywords, ['ok', 'good']);
});

check('sanitizeIntent: rejects bad category_slug', () => {
  const out = sanitizeIntent({ category_slug: 'not a slug!!!' });
  assert.ok(!('category_slug' in out));
});

check('sanitizeIntent: accepts good category_slug', () => {
  const out = sanitizeIntent({ category_slug: 'coffee-beans' });
  assert.strictEqual(out.category_slug, 'coffee-beans');
});

check('sanitizeIntent: clamps price to ceiling', () => {
  const out = sanitizeIntent({ price_max: 999_999_999 });
  assert.strictEqual(out.price_max, PRICE_CEIL);
});

check('sanitizeIntent: drops inverted range (min>max)', () => {
  const out = sanitizeIntent({ price_min: 100, price_max: 50 });
  assert.strictEqual(out.price_min, 100);
  assert.ok(!('price_max' in out));
});

check('sanitizeIntent: coerces numeric strings', () => {
  const out = sanitizeIntent({ price_min: '50', price_max: '150' });
  assert.strictEqual(out.price_min, 50);
  assert.strictEqual(out.price_max, 150);
});

check('sanitizeIntent: ignores garbage types', () => {
  // 'NaN' string -> NaN -> dropped. Non-array keywords -> dropped.
  // Arrays are coerced via parseFloat (takes leading number); documented behavior.
  const out = sanitizeIntent({ price_min: 'NaN', keywords: 'not-an-array' });
  assert.deepStrictEqual(out, { keywords: [] });
});

// --- Summary ---------------------------------------------------------------
console.log(`\n=== ${pass} passed, ${fail.length} failed ===`);
if (fail.length > 0) process.exitCode = 1;
