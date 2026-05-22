/**
 * Consumer typecheck: `trackChangesHelpers` core helpers (PR B of
 * SD-2980) return real shapes, not `any` / `any[]`.
 *
 * Before this change, every exported helper in `markSnapshotHelpers`
 * and `documentHelpers` resolved to `(...args: any[]) => any[]` in the
 * published `.d.ts` (39 audit findings). PR B added JSDoc on every
 * helper. This fixture pins the visible return / parameter shapes so a
 * regression breaks the typecheck matrix, not just the inventory count.
 *
 * Coverage:
 * - markSnapshotHelpers: createMarkSnapshot, getTypeName,
 *   isTrackFormatNoOp, attrsExactlyMatch, markSnapshotMatchesStepMark,
 *   hasMatchingMark, upsertMarkSnapshotByType, findMarkInRangeBySnapshot
 * - documentHelpers: findMarkPosition, flatten, findChildren,
 *   findInlineNodes (the 3-arg track-changes variant, distinct from
 *   `@core/helpers/findChildren`)
 */

import { trackChangesHelpers } from 'superdoc/super-editor';
import type { Node as PmNode, Mark as PmMark } from 'prosemirror-model';

declare const doc: PmNode;
declare const mark: PmMark;
declare const liveMarks: PmMark[];

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// --- MarkSnapshot output shape -------------------------------------------

const snap = trackChangesHelpers.createMarkSnapshot('bold');
const _snapType: string = snap.type;
const _snapAttrs: Record<string, unknown> = snap.attrs;
void _snapType;
void _snapAttrs;

// `createMarkSnapshot` return is NOT any.
const _snapNotAny: Equal<typeof snap, any> = false;
void _snapNotAny;

// --- getTypeName returns string | undefined ------------------------------

const name = trackChangesHelpers.getTypeName(snap);
const _nameIsStringOrUndefined: Equal<typeof name, string | undefined> = true;
void _nameIsStringOrUndefined;
// Accepts a live PM Mark too.
trackChangesHelpers.getTypeName(mark);

// --- isTrackFormatNoOp / attrsExactlyMatch return boolean ----------------

const _noopReturn: boolean = trackChangesHelpers.isTrackFormatNoOp([snap], [snap]);
const _attrsMatchReturn: boolean = trackChangesHelpers.attrsExactlyMatch({ a: 1 }, { a: 1 });
void _noopReturn;
void _attrsMatchReturn;

// --- hasMatchingMark + markSnapshotMatchesStepMark return boolean -------

const _hasMatch: boolean = trackChangesHelpers.hasMatchingMark(liveMarks, snap);
const _stepMatch: boolean = trackChangesHelpers.markSnapshotMatchesStepMark(snap, snap, true);
void _hasMatch;
void _stepMatch;

// --- upsertMarkSnapshotByType returns MarkSnapshot[] (output strict) -----

const upserted = trackChangesHelpers.upsertMarkSnapshotByType([snap], snap);
const _upsertedNotAnyArr: Equal<typeof upserted, any[]> = false;
void _upsertedNotAnyArr;
// Element members are typed.
if (upserted[0]) {
  const _t: string = upserted[0].type;
  const _a: Record<string, unknown> = upserted[0].attrs;
  void _t;
  void _a;
}

// --- findMarkInRangeBySnapshot returns PmMark | null --------------------

const liveMark = trackChangesHelpers.findMarkInRangeBySnapshot({
  doc,
  from: 0,
  to: 10,
  snapshot: snap,
});
const _liveMarkNotAny: Equal<typeof liveMark, any> = false;
void _liveMarkNotAny;
// `null` must be in the union.
const _nullableLive: null extends typeof liveMark ? true : false = true;
void _nullableLive;
if (liveMark) {
  // PM Mark exposes `.type.name` (MarkType.name), not just `any`.
  const _typeName: string = liveMark.type.name;
  void _typeName;
}

// --- documentHelpers: findMarkPosition returns nullable range -----------

const range = trackChangesHelpers.documentHelpers.findMarkPosition(doc, 5, 'link');
const _rangeNotAny: Equal<typeof range, any> = false;
void _rangeNotAny;
if (range) {
  const _from: number = range.from;
  const _to: number = range.to;
  const _attrs: Record<string, unknown> = range.attrs;
  void _from;
  void _to;
  void _attrs;
}

// --- documentHelpers: flatten / findChildren / findInlineNodes ----------

type FlattenReturn = ReturnType<typeof trackChangesHelpers.documentHelpers.flatten>;
type FindChildrenReturn = ReturnType<typeof trackChangesHelpers.documentHelpers.findChildren>;
type FindInlineReturn = ReturnType<typeof trackChangesHelpers.documentHelpers.findInlineNodes>;

const _flattenNotAnyArr: Equal<FlattenReturn, any[]> = false;
const _findChildrenNotAnyArr: Equal<FindChildrenReturn, any[]> = false;
const _findInlineNotAnyArr: Equal<FindInlineReturn, any[]> = false;
void _flattenNotAnyArr;
void _findChildrenNotAnyArr;
void _findInlineNotAnyArr;

// Element shape: { node: PmNode; pos: number }
function consumeEntry(entry: FlattenReturn[number]): void {
  const _n: PmNode = entry.node;
  const _p: number = entry.pos;
  const _typeName: string = entry.node.type.name;
  void _n;
  void _p;
  void _typeName;
}
void consumeEntry;

// 3-arg findChildren is distinct from the simpler core variant.
trackChangesHelpers.documentHelpers.findChildren(doc, (node) => node.isInline, true);
trackChangesHelpers.documentHelpers.findChildren(doc, (node) => node.isInline);

// Predicate receives PmNode, not any.
trackChangesHelpers.documentHelpers.findChildren(doc, (node) => {
  return node.type.name === 'paragraph';
});

// @ts-expect-error SD-2980 PR B: predicate must accept a Node, not a string.
trackChangesHelpers.documentHelpers.findChildren(doc, (s: string) => s.length > 0);

// @ts-expect-error SD-2980 PR B: findMarkPosition needs a string mark name.
trackChangesHelpers.documentHelpers.findMarkPosition(doc, 5, 42);
