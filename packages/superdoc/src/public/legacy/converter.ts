/**
 * SuperDoc public facade: legacy converter entry.
 *
 * SD-3180 under SD-3178 (Phase 3 of SD-3175). Mirrors the existing
 * `superdoc/converter` subpath under the path-as-contract structure.
 *
 * Classification: **legacy public compatibility surface** per
 * `docs/architecture/package-boundaries.md` Decision 4. New code should
 * import `SuperConverter` from `superdoc` directly.
 *
 * AIDEV-NOTE: Single-export facade. Growing this list ships a new public
 * symbol through a legacy compat path, which violates the no-growth
 * posture this entry is classified under. Adding or removing an export
 * here updates the `expectedNames` for the `legacy/converter` entry in
 * `FACADE_ENTRIES` inside
 * `packages/superdoc/scripts/verify-public-facade-emit.cjs` in the
 * same PR.
 */
export { SuperConverter } from '@superdoc/super-editor/converter';
