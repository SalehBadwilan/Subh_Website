/**
 * AI product-search business logic.
 *
 * Two-step semantic search:
 *   1) analyzeSearchIntent() — ask OpenAI to turn the shopper's free-text
 *      Arabic query into a small, validated JSON filter object.
 *   2) searchProducts() — run that filter against the catalog with a normal,
 *      indexed Sequelize query. The DB (not the LLM) decides results, so we
 *      stay cheap, fast, and deterministic.
 *
 * This separation means the model only ever does language understanding; it
 * never touches the database or returns product rows directly.
 */
import { Op } from 'sequelize';

import logger from '../../../config/logger.js';
import env from '../../../config/env.js';
import { chatCompletion } from './openaiClient.js';
import { aiParseError, aiNotConfigured } from '../utils/aiErrors.js';

// Guard rails so a bad/crafted model output can never produce a pathological
// DB query.
const MAX_KEYWORDS = 5; // cap OR-of-ILIKE clauses per request
const MAX_KEYWORD_LEN = 60; // ignore absurdly long single tokens
const PRICE_FLOOR = 0;
const PRICE_CEIL = 10_000_000; // 10M SAR — sanity ceiling, not a business rule

/**
 * Normalize a shopper's free-text query before sending it to the model.
 *
 * Why: the query reaches an external API, so we (a) strip control characters
 * that could hide injections or confuse tokenization, (b) collapse redundant
 * whitespace to avoid wasting tokens, and (c) apply Unicode NFC so visually
 * identical Arabic strings compare equal downstream. This is NOT a security
 * boundary for the DB (parameterized queries handle that) — it is hygiene +
 * cost control for the model call.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeQuery(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFC');
  // Strip C0/C1 control chars + BOM. Kept on one line; we want a single-line
  // search string, so map them to a space then collapse whitespace below.
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u001F\u007F-\u009F\uFEFF]/g, ' ');
  // Collapse runs of whitespace into a single space and trim ends.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Escape LIKE/ILIKE wildcards (`%`, `_`) and the escape char itself so a
 * keyword that literally contains these characters is matched as a literal,
 * not as a wildcard pattern. Backslash is used as the ESCAPE character (the
 * default for Postgres LIKE; Sequelize passes the pattern as a parameter).
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeLike(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Build the system prompt that constrains the model to JSON-only output.
 * Kept in one place so it's easy to review/tune.
 */
function buildSystemPrompt() {
  return [
    'أنت مسؤول عن تحليل استعلام بحث من عميل في متجر إلكتروني سعودي.',
    'حلّل النص العربي واستخرج قصد البحث، ثم أعد النتيجة كـ JSON صالح فقط (بدون أي شرح أو نص خارج كائن JSON).',
    '',
    'مخطط JSON المطلوب (كل الحقول اختيارية إلا keywords):',
    '{',
    '  "keywords": ["كلمة1", "كلمة2"],     // كلمات/عبارات مفتاحية للبحث، حتى 5، بدون رموز زائدة',
    '  "category_slug": "coffee",          // slug التصنيف إن أمكن استنباطه، وإلا احذفه',
    '  "price_min": 0,                     // أدنى سعر بالريال السعودي إن ذُكر، وإلا احذفه',
    '  "price_max": 100                     // أقصى سعر بالريال السعودي إن ذُكر، وإلا احذفه',
    '}',
    '',
    'قواعد صارمة:',
    '- أعد JSON فقط. لا علامات اقتباس خارجية، لا ```، لا تفسير.',
    '- keywords: كلمات دالة على المنتج (مثل اسمه أو وصفه) وليست كلمات وقف أو أرقام صرف.',
    '- price_min <= price_max دائمًا.',
    '- إن لم تستطع استنباط حقل فاحذفه بدل وضع قيمة فارغة أو صفر.',
  ].join('\n');
}

/**
 * Extract a JSON object from a model completion that *should* be JSON-only,
 * but defensively strips stray code fences / surrounding prose first.
 */
function extractJson(content) {
  let text = content.trim();

  // Strip ```json ... ``` fences if the model added them despite instructions.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // If there is still surrounding prose, grab the outermost {...} block.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }

  return JSON.parse(text);
}

/**
 * Validate + sanitize the parsed intent. Coerces types, drops garbage, and
 * enforces the guard rails. Always returns a well-shaped object.
 */
function sanitizeIntent(parsed) {
  const intent = { keywords: [] };

  if (Array.isArray(parsed.keywords)) {
    const seen = new Set();
    for (const kwRaw of parsed.keywords) {
      if (typeof kwRaw !== 'string') continue;
      const kw = kwRaw.trim();
      if (kw.length === 0 || kw.length > MAX_KEYWORD_LEN) continue;
      const lower = kw.toLowerCase();
      if (seen.has(lower)) continue; // de-dup
      seen.add(lower);
      intent.keywords.push(kw);
      if (intent.keywords.length >= MAX_KEYWORDS) break;
    }
  }

  if (typeof parsed.category_slug === 'string' && parsed.category_slug.trim()) {
    // slugs are URL-safe by convention; allow only a conservative charset.
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
  // Drop an inverted/contradictory range rather than letting it match nothing
  // silently in surprising ways — keep whichever bound is most informative.
  if (intent.price_min != null && intent.price_max != null && intent.price_min > intent.price_max) {
    delete intent.price_max;
  }

  return intent;
}

/**
 * Step 1 — Turn a free-text query into a structured search intent.
 *
 * @param {object} params
 * @param {string} params.query  The shopper's search text.
 * @param {object} [params.options] Forwarded to the OpenAI client.
 * @returns {Promise<object>} Sanitized intent: { keywords, category_slug?, price_min?, price_max? }
 */
export async function analyzeSearchIntent({ query, options }) {
  if (!env.aiApiKeyConfigured) throw aiNotConfigured();

  // Sanitize the user text before it leaves the process. normalizeQuery strips
  // control chars, applies NFC, and collapses whitespace — cleaner prompt, fewer
  // tokens, no hidden control sequences. Validation (length) is the route's job.
  const normalizedQuery = normalizeQuery(query);

  const { content } = await chatCompletion({
    system: buildSystemPrompt(),
    user: normalizedQuery,
    options,
  });

  let parsed;
  try {
    parsed = extractJson(content);
  } catch (err) {
    logger.error('[ai] Failed to parse intent JSON:', err.message);
    throw aiParseError(err.message);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw aiParseError('model did not return a JSON object');
  }

  const intent = sanitizeIntent(parsed);
  logger.debug('[ai] Intent analyzed:', JSON.stringify(intent));
  return intent;
}

/**
 * Step 2 — Run the (sanitized) intent against the catalog.
 *
 * Uses standard indexed ILIKE on name/description/sku. Keywords are OR-ed;
 * price and category are AND-ed. Active products only.
 *
 * @param {object} params
 * @param {import('sequelize').Model} params.Product
 * @param {import('sequelize').Model} params.Category
 * @param {object} params.intent       Output of analyzeSearchIntent.
 * @param {object} params.pagination   { page, limit, offset } from parsePagination.
 * @returns {Promise<{ rows: any[], count: number }>}
 */
export async function searchProducts({ Product, Category, intent, pagination }) {
  const { page, limit, offset } = pagination;

  const where = { status: 'active' };

  // --- Keyword matching (OR over fields) -----------------------------------
  // Build a search-term list from the intent keywords. For each multi-word
  // keyword (e.g. "قهوة عربية") we ALSO add its individual tokens ("قهوة",
  // "عربية"). This makes Arabic search resilient to small morphological gaps
  // (e.g. "عربية" vs "عربيه", yaa vs taa-marbuta) that an exact ILIKE on the
  // full phrase would miss. Tokens shorter than 3 chars are dropped to avoid
  // matching noise. All terms are OR-ed across name/description/sku.
  const rawKeywords = (intent.keywords || []).filter(Boolean);
  const searchTerms = [];
  const seenTerms = new Set();
  const addTerm = (t) => {
    const v = String(t || '').trim();
    if (v.length >= 3 && !seenTerms.has(v.toLowerCase())) {
      seenTerms.add(v.toLowerCase());
      searchTerms.push(v);
    }
  };
  for (const kw of rawKeywords) {
    addTerm(kw); // the full phrase first
    for (const token of String(kw).split(/\s+/)) addTerm(token); // then its tokens
  }
  if (searchTerms.length > 0) {
    const fields = ['name_ar', 'description_ar', 'sku'];
    // escapeLike neutralizes % and _ so they match literally, not as wildcards.
    // The leading/trailing % are the ONLY wildcards we intend.
    where[Op.and] = [
      {
        [Op.or]: searchTerms.flatMap((term) =>
          fields.map((field) => ({ [field]: { [Op.iLike]: `%${escapeLike(term)}%` } })),
        ),
      },
    ];
  }

  // --- Price band (AND) ----------------------------------------------------
  if (intent.price_min != null || intent.price_max != null) {
    where.price_sar = {};
    if (intent.price_min != null) where.price_sar[Op.gte] = intent.price_min;
    if (intent.price_max != null) where.price_sar[Op.lte] = intent.price_max;
  }

  // --- Category via slug (AND) --------------------------------------------
  // Resolve the slug to an id once, then filter. Kept simple for the MVP.
  let categoryInclude = [];
  if (intent.category_slug) {
    const category = await Category.findOne({
      where: { slug: intent.category_slug, is_active: true },
      attributes: ['id'],
    });
    if (category) {
      where.category_id = category.id;
    }
    // If the model guessed a slug that doesn't exist in our catalog, we DON'T
    // return an empty page — instead we DROP the category filter and fall back
    // to keyword + price matching. This keeps the search useful even when the
    // model invents/hallucinates a category that isn't ours. The keyword query
    // (already built above) is the primary signal anyway.
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: categoryInclude,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });

  return { rows, count, page, limit };
}

export default { analyzeSearchIntent, searchProducts };
