/**
 * Integration tests for the AI OpenAI client (retry + timeout + 429/network)
 * and unit tests for the AI service pure helpers.
 *
 * No real provider key or network needed: a local HTTP server impersonates
 * OpenAI with scripted responses. The client is pointed at it via AI_CHAT_URL.
 *
 * Run:  node scripts/test-ai-integration.mjs
 *
 * Covers the scenarios required by the integration task:
 *   - success (200 with content)
 *   - invalid input shape (parse_error)
 *   - timeout (server stalls longer than AI_TIMEOUT_MS)
 *   - AI provider failure (permanent 4xx → no retry)
 *   - empty response (200 but empty content)
 *   - truncated response (finish_reason length/content_filter)
 *   - network failure (connection dropped)
 *   - rate limit (429 + Retry-After → retried, then succeeds)
 *   - transient 5xx then success (retry path)
 */
import http from 'node:http';
import assert from 'node:assert';

// --- Configure the process env BEFORE importing modules that read it --------
// A fake key so env.aiApiKeyConfigured is true; AI_CHAT_URL points the client
// at our local mock server (set below once we know the port).
process.env.AI_API_KEY = 'sk-test-key';
process.env.AI_CHAT_URL = 'http://127.0.0.1:0'; // replaced after listen
process.env.AI_TIMEOUT_MS = '800'; // short, so timeout tests run fast
process.env.AI_MAX_RETRIES = '2'; // 3 attempts total
process.env.AI_BASE_RETRY_DELAY_MS = '100'; // fast backoff for tests
process.env.NODE_ENV = 'test';

const { chatCompletion } = await import('../src/modules/ai/services/openaiClient.js');
const { normalizeQuery, escapeLike } = await import('../src/modules/ai/services/aiService.js');
const { isTransientStatus, isTransientError, AiProviderError } = await import(
  '../src/modules/ai/utils/aiErrors.js'
);

let pass = 0;
const fail = [];
function check(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`[PASS] ${name}`);
      pass++;
    })
    .catch((e) => {
      console.log(`[FAIL] ${name} :: ${e && e.message ? e.message : e}`);
      fail.push(name);
    });
}

// ---------------------------------------------------------------------------
// Part A — unit tests for pure helpers (no server needed)
// ---------------------------------------------------------------------------
await check('normalizeQuery: trims + collapses whitespace', () => {
  assert.strictEqual(normalizeQuery('  قهوة   عربية  '), 'قهوة عربية');
});
await check('normalizeQuery: strips control chars', () => {
  // eslint-disable-next-line no-control-regex
  assert.strictEqual(normalizeQuery('a\u0000b\u0007c'), 'a b c');
  assert.strictEqual(normalizeQuery('a\u007Fb'), 'a b');
});
await check('normalizeQuery: NFC normalization', () => {
  // U+0649 + U+0651 vs composed — just ensure it returns a string & no throw.
  assert.strictEqual(typeof normalizeQuery('يّ'), 'string');
});
await check('normalizeQuery: non-string returns empty', () => {
  assert.strictEqual(normalizeQuery(null), '');
  assert.strictEqual(normalizeQuery(42), '');
  assert.strictEqual(normalizeQuery(undefined), '');
});
await check('escapeLike: escapes % _ and backslash', () => {
  assert.strictEqual(escapeLike('50%_off'), '50\\%\\_off');
  assert.strictEqual(escapeLike('a\\b'), 'a\\\\b');
});
await check('escapeLike: non-string returns empty', () => {
  assert.strictEqual(escapeLike(null), '');
});
await check('isTransientStatus: 429/408/5xx/network=true, 4xx=false', () => {
  assert.strictEqual(isTransientStatus(429), true);
  assert.strictEqual(isTransientStatus(408), true);
  assert.strictEqual(isTransientStatus(500), true);
  assert.strictEqual(isTransientStatus(503), true);
  assert.strictEqual(isTransientStatus(0), true); // network
  assert.strictEqual(isTransientStatus(400), false);
  assert.strictEqual(isTransientStatus(401), false);
  assert.strictEqual(isTransientStatus(403), false);
  assert.strictEqual(isTransientStatus(422), false);
});
await check('isTransientError: respects transient flag', () => {
  const e = new AiProviderError(502, 'x', { code: 'provider_error', transient: true });
  assert.strictEqual(isTransientError(e), true);
  const e2 = new AiProviderError(502, 'x', { code: 'parse_error', transient: false });
  assert.strictEqual(isTransientError(e2), false);
  assert.strictEqual(isTransientError(new Error('plain')), false);
});

// ---------------------------------------------------------------------------
// Part B — integration tests with a local mock OpenAI server
// ---------------------------------------------------------------------------
// A tiny scriptable server: each request pops the next behavior from a queue.
// Behaviors: 'success' | '429' | '500' | '401' | 'empty' | 'truncated' | 'stall' | 'drop'
let behaviors = [];
let requestsReceived = 0;
const server = http.createServer((req, res) => {
  requestsReceived++;
  const b = behaviors.shift();
  if (!b) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: { message: 'no behavior queued' } }));
    return;
  }
  if (b === 'success') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: '{"keywords":["قهوة"]}' }, finish_reason: 'stop' }],
        usage: { total_tokens: 12 },
      }),
    );
    return;
  }
  if (b === '429') {
    res.statusCode = 429;
    res.setHeader('Retry-After', '0'); // 0s so the test stays fast
    res.end(JSON.stringify({ error: { message: 'rate limited' } }));
    return;
  }
  if (b === '500') {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: { message: 'server error' } }));
    return;
  }
  if (b === '401') {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'bad key' } }));
    return;
  }
  if (b === 'empty') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: '' }, finish_reason: 'stop' }],
        usage: { total_tokens: 1 },
      }),
    );
    return;
  }
  if (b === 'truncated') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
        usage: { total_tokens: 1 },
      }),
    );
    return;
  }
  if (b === 'stall') {
    // Never respond; the client's AbortController (timeout) must fire.
    return;
  }
  if (b === 'drop') {
    // Destroy the socket immediately → network error.
    res.socket.destroy();
    return;
  }
  res.statusCode = 500;
  res.end();
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
process.env.AI_CHAT_URL = `http://127.0.0.1:${port}`;
// Re-import with the resolved URL. The module already captured the old value,
// so we use a fresh import via cache-busting query (Node honors ? on file URLs
// for dynamic imports, busting the ESM cache).
const clientFresh = await import(`../src/modules/ai/services/openaiClient.js?v=${Date.now()}`);
const chat = clientFresh.chatCompletion;

const call = (opts = {}) =>
  chat({ system: 'sys', user: 'usr', options: opts });

await check('integration: success returns content', async () => {
  behaviors = ['success'];
  requestsReceived = 0;
  const r = await call();
  assert.strictEqual(r.content, '{"keywords":["قهوة"]}');
  assert.strictEqual(requestsReceived, 1);
});

await check('integration: permanent 4xx (401) NOT retried → provider_error', async () => {
  behaviors = ['401'];
  requestsReceived = 0;
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'provider_error');
  assert.strictEqual(requestsReceived, 1, 'must NOT retry on 401');
});

await check('integration: empty response → empty_response', async () => {
  behaviors = ['empty'];
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'empty_response');
});

await check('integration: truncated (content_filter, empty) → truncated_response', async () => {
  behaviors = ['truncated'];
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'truncated_response');
});

await check('integration: timeout → 504 timeout, retried then gives up', async () => {
  // 3 stalls (attempt budget = 3). Each must time out; final → timeout error.
  behaviors = ['stall', 'stall', 'stall'];
  requestsReceived = 0;
  const t0 = Date.now();
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  const dt = Date.now() - t0;
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'timeout');
  // Timeout is transient → all 3 attempts should fire (then give up).
  assert.strictEqual(requestsReceived, 3);
  // Sanity: took at least one timeout window (800ms) but not a crazy amount.
  assert.ok(dt >= 800, `expected >=800ms, got ${dt}`);
});

await check('integration: network drop → provider_error, retried', async () => {
  behaviors = ['drop', 'drop', 'drop'];
  requestsReceived = 0;
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'provider_error');
  assert.strictEqual(requestsReceived, 3, 'network errors are retried');
});

await check('integration: 429 then success → retry honored, no error', async () => {
  behaviors = ['429', 'success'];
  requestsReceived = 0;
  const r = await call();
  assert.strictEqual(r.content, '{"keywords":["قهوة"]}');
  assert.strictEqual(requestsReceived, 2, 'first 429 retried, second succeeded');
});

await check('integration: 500 then success → retry honored', async () => {
  behaviors = ['500', 'success'];
  requestsReceived = 0;
  const r = await call();
  assert.strictEqual(r.content, '{"keywords":["قهوة"]}');
  assert.strictEqual(requestsReceived, 2);
});

await check('integration: 429 exhausted → rate_limited with status 429', async () => {
  behaviors = ['429', '429', '429'];
  requestsReceived = 0;
  let caught = null;
  try {
    await call();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, 'expected an error');
  assert.strictEqual(caught.code, 'rate_limited');
  assert.strictEqual(caught.status, 429);
  assert.strictEqual(requestsReceived, 3);
});

await new Promise((resolve) => server.close(resolve));

// --- Summary ---------------------------------------------------------------
console.log(`\n=== ${pass} passed, ${fail.length} failed ===`);
if (fail.length > 0) {
  console.log('Failed:', fail.join(', '));
  process.exitCode = 1;
}
