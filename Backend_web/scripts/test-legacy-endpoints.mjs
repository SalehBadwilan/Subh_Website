/**
 * Smoke test: confirm the PRE-EXISTING endpoints still work after the Customer
 * APIs were added. Verifies the "do not break previous endpoints" requirement.
 */
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;

async function main() {
  const { app } = await bootApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(env.port, () => resolve(s));
  });

  const checks = [];
  try {
    let r = await fetch(`${BASE}/api/health`);
    let j = await r.json();
    checks.push(`health status=${r.status} db=${j.database && j.database.status}`);

    r = await fetch(`${BASE}/api/ai-status`);
    j = await r.json();
    checks.push(`ai-status status=${r.status} ok=${j.ok}`);

    r = await fetch(`${BASE}/api/categories`);
    j = await r.json();
    checks.push(`categories status=${r.status} count=${j.data && j.data.length}`);

    r = await fetch(`${BASE}/`);
    j = await r.json();
    checks.push(`root status=${r.status} name=${j.name}`);

    // admin CRUD that must still be reachable (POST/PUT/DELETE on /products
    // fall through the customer router which only defines GET).
    r = await fetch(`${BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'legacycheck' + Date.now(), name_ar: 'فحص قديم' }),
    });
    j = await r.json();
    checks.push(`categories POST (admin) status=${r.status} created=${!!(j.data && j.data.id)}`);

    console.log('=== LEGACY ENDPOINTS CHECK ===');
    for (const c of checks) console.log('  ' + c);
    const allOk = checks.every((c) => /status=2\d\d|status=200/.test(c) || c.includes('status=201'));
    console.log(allOk ? '\nLEGACY: ALL OK ✅' : '\nLEGACY: CHECK FAILED ❌');
  } catch (e) {
    console.error('Legacy test crashed:', e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await sequelize.close().catch(() => {});
  }
}

main();
