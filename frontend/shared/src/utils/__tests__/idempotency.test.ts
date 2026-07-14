import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../idempotency';

describe('idempotency', () => {
  it('يولّد مفتاحاً فريداً في كل مرة', () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toBe(b);
  });

  it('المفتاح بصيغة UUID-ish', () => {
    const key = generateIdempotencyKey();
    expect(key.length).toBeGreaterThanOrEqual(32);
    // يحتوي على 4 في النسخة (UUIDv4) أو fallback طويل.
    expect(key).toMatch(/-/);
  });
});
