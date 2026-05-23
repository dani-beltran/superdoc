#!/usr/bin/env node
/**
 * Enforce the public-contract tier discipline defined in
 * `packages/superdoc/scripts/type-surface.config.cjs` (`publicContract`).
 *
 * `report:public:superdoc` is the read-only sibling that PRINTS the
 * same tier metadata for humans without changing exit codes. This
 * script is the gate version: it fails the build if any of the
 * invariants below are violated.
 *
 * Invariants (cheap; read package.json + the config; no I/O):
 *
 *   1. Every `package.json#exports` subpath has a `publicContract`
 *      entry. A new subpath added without a contract entry is a
 *      regression: the report says "internal by definition" and
 *      the consumer-facing tier promise is silently empty.
 *   2. Every `publicContract` subpath actually exists in
 *      `package.json#exports`. Stale entries lie about what's
 *      published.
 *   3. No subpath appears in more than one tier. The metadata is
 *      meant to be a partition.
 *   4. Routing rules:
 *      - `supported` subpaths must resolve types under
 *        `dist/superdoc/src/public/` AND NOT under
 *        `dist/superdoc/src/public/legacy/`. Supported APIs route
 *        through the curated public facade.
 *      - `legacy` subpaths must resolve types under
 *        `dist/superdoc/src/public/legacy/`.
 *      - `legacyRaw` subpaths must NOT resolve under
 *        `dist/superdoc/src/public/`. That's the whole point of
 *        the legacy-raw bucket: an un-curated dist path.
 *      - `asset` subpaths have no type field requirement.
 *   5. `legacyRaw` may only contain `./super-editor`. Any other
 *      legacy-raw entry is a regression: the team explicitly
 *      accepted `./super-editor` as the one un-curated bucket
 *      pending SD-3256 Phase 3; everything else must route through
 *      `src/public/legacy/**`.
 *
 * Local usage:
 *   pnpm exec node scripts/check-public-contract-tiers.mjs
 *
 * Wrapper: runs as stage 1 of `check:public:superdoc`. Cheap (~10ms);
 * fast-fails before the slow build/matrix stages so contributors
 * see a clear error early.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const config = require(resolve(REPO_ROOT, 'packages/superdoc/scripts/type-surface.config.cjs'));
const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages/superdoc/package.json'), 'utf8'));

const { publicContract } = config;
if (!publicContract) {
  console.error('FAIL: publicContract not exported from type-surface.config.cjs');
  process.exit(1);
}

const PUBLIC_DIR_PREFIX = './dist/superdoc/src/public/';
const PUBLIC_LEGACY_PREFIX = './dist/superdoc/src/public/legacy/';
const LEGACY_RAW_ALLOWED = new Set(['./super-editor']);

/**
 * Pull the types path out of an exports entry. Accepts the conditional
 * shapes the SuperDoc package uses: a string, or an object with
 * `types: '...'` / `types: { import: '...', require: '...' }`.
 */
function resolveTypesPath(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const t = entry.types;
    if (typeof t === 'string') return t;
    if (t && typeof t === 'object') return t.import ?? t.require ?? null;
  }
  return null;
}

const failures = [];
const fail = (msg) => failures.push(msg);

// Build flat tier list with bucket name for error attribution.
const tiers = [
  ['supported', publicContract.supported],
  ['legacy', publicContract.legacy],
  ['legacyRaw', publicContract.legacyRaw],
  ['asset', publicContract.asset],
  ['deprecated', publicContract.deprecated],
];

// 3. No subpath appears in more than one tier.
const subpathTier = new Map();
for (const [bucket, entries] of tiers) {
  for (const e of entries) {
    if (subpathTier.has(e.subpath)) {
      fail(
        `subpath "${e.subpath}" appears in multiple tiers: ${subpathTier.get(e.subpath)} and ${bucket}`,
      );
    } else {
      subpathTier.set(e.subpath, bucket);
    }
  }
}

const exportsMap = pkg.exports || {};
const exportSubpaths = new Set(Object.keys(exportsMap));
const contractSubpaths = new Set(subpathTier.keys());

// 1. Every exports subpath has a contract entry.
for (const s of exportSubpaths) {
  if (!contractSubpaths.has(s)) {
    fail(
      `MISSING contract entry: package.json#exports has "${s}" but it is not in publicContract.* — add to a tier with a routing note.`,
    );
  }
}

// 2. Every contract entry exists in exports.
for (const s of contractSubpaths) {
  if (!exportSubpaths.has(s)) {
    fail(
      `STALE contract entry: publicContract has "${s}" but package.json#exports does not list it — remove from publicContract or restore the export.`,
    );
  }
}

// 4. Routing rules per tier.
for (const e of publicContract.supported) {
  if (!exportsMap[e.subpath]) continue;
  const t = resolveTypesPath(exportsMap[e.subpath]);
  if (!t) {
    fail(`supported "${e.subpath}": no types field on the exports entry`);
    continue;
  }
  if (!t.startsWith(PUBLIC_DIR_PREFIX)) {
    fail(
      `supported "${e.subpath}": types resolve to "${t}" — expected to route through ${PUBLIC_DIR_PREFIX}**`,
    );
  } else if (t.startsWith(PUBLIC_LEGACY_PREFIX)) {
    fail(
      `supported "${e.subpath}": types resolve under ${PUBLIC_LEGACY_PREFIX}** — supported entries must not route through the legacy facade`,
    );
  }
}

for (const e of publicContract.legacy) {
  if (!exportsMap[e.subpath]) continue;
  const t = resolveTypesPath(exportsMap[e.subpath]);
  if (!t) {
    fail(`legacy "${e.subpath}": no types field on the exports entry`);
    continue;
  }
  if (!t.startsWith(PUBLIC_LEGACY_PREFIX)) {
    fail(
      `legacy "${e.subpath}": types resolve to "${t}" — expected to route through ${PUBLIC_LEGACY_PREFIX}**`,
    );
  }
}

for (const e of publicContract.legacyRaw) {
  // 5. legacyRaw is restricted to the explicitly accepted set.
  if (!LEGACY_RAW_ALLOWED.has(e.subpath)) {
    fail(
      `legacyRaw "${e.subpath}": not on the accepted list ([${[...LEGACY_RAW_ALLOWED].join(', ')}]). New legacy entries must route through src/public/legacy/** instead.`,
    );
  }
  if (!exportsMap[e.subpath]) continue;
  const t = resolveTypesPath(exportsMap[e.subpath]);
  if (t && t.startsWith(PUBLIC_DIR_PREFIX)) {
    fail(
      `legacyRaw "${e.subpath}": types resolve under ${PUBLIC_DIR_PREFIX}** — promote to legacy (route through src/public/legacy/**) instead`,
    );
  }
}

// `asset` and `deprecated` carry no routing requirement; they exist so
// the report has full coverage of every exports subpath.

const HR = '='.repeat(72);
if (failures.length === 0) {
  console.log(HR);
  console.log('public-contract tier discipline: PASS');
  console.log(HR);
  console.log(
    `${exportSubpaths.size} exports / ${contractSubpaths.size} contract entries / ${tiers.reduce((n, [, list]) => n + list.length, 0)} tiered.`,
  );
  process.exit(0);
}

console.error(HR);
console.error('public-contract tier discipline: FAIL');
console.error(HR);
for (const f of failures) console.error(`  - ${f}`);
console.error('');
console.error(
  'Tier definitions: packages/superdoc/scripts/type-surface.config.cjs (publicContract).',
);
console.error('Read-only inspection: `pnpm report:public:superdoc`.');
process.exit(1);
