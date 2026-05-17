/**
 * SuperDoc public facade: root entry.
 *
 * SD-3178 (Phase 3 of SD-3175). This file is the first real source-side
 * public facade for SuperDoc. The intent is path-as-contract: anything
 * exported from `packages/superdoc/src/public/**` is supported public API,
 * and anything outside is implementation detail. Subsequent PRs in the
 * SD-3175 umbrella expand this directory entry-by-entry; Phase 4 (the
 * contract switch) flips `package.json#exports` to point at the emitted
 * declarations under this tree.
 *
 * Rules for this file:
 *   - Named exports only. No `export *` from implementation barrels.
 *   - Explicit `.js` source specifiers (the dts plugin emits `.js`
 *     specifiers; source consistency keeps the two aligned).
 *   - Anything added here is a deliberate public-API decision. Update the
 *     `EXPECTED_NAMES` list in `packages/superdoc/scripts/verify-public-facade-emit.cjs`
 *     in the same PR and link the PR to SD-3175 (or a child ticket) for
 *     reviewer sign-off.
 *
 * The initial export set deliberately mirrors the symbols validated by
 * SD-3177 (the emit feasibility spike): a runtime value with a typed
 * surface (`SuperDoc`, `Config`) plus the augmentation-bearing pair
 * (`Editor`, `EditorCommands`). This guarantees the same regression
 * tests that proved the pipeline keep proving it.
 */
export { SuperDoc } from '../core/SuperDoc.js';
export type { Config } from '../core/types/index.js';
export { Editor } from '@superdoc/super-editor';
export type { EditorCommands } from '@superdoc/super-editor';
