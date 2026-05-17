import { describe, it, expect } from 'vitest';
import { SuperConverter } from './converter.js';

/**
 * Smoke test for the legacy public facade converter entry (SD-3180).
 * Declaration-side validation (symbol set, leak grep) lives in
 * `packages/superdoc/scripts/verify-public-facade-emit.cjs`.
 */
describe('public facade (legacy/converter)', () => {
  it('re-exports SuperConverter as a constructor', () => {
    expect(typeof SuperConverter).toBe('function');
  });
});
