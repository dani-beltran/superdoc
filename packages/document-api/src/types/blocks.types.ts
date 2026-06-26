import type { BlockNodeType, BlockNodeAddress, DeletableBlockNodeAddress } from './base.js';
import type { AffectedRef, Receipt, ReceiptInsert, TextRangeShift } from './receipt.js';
import type { StoryLocator } from './story.types.js';
import type { ParagraphNumbering } from './paragraph.types.js';
// ---------------------------------------------------------------------------
// blocks.list
// ---------------------------------------------------------------------------
export interface BlockListEntry {
  ordinal: number;
  nodeId: string;
  nodeType: BlockNodeType;
  textPreview: string | null;
  /** Full flattened block text when requested via BlocksListInput.includeText. */
  text?: string | null;
  isEmpty: boolean;
  /** Named paragraph style ID (e.g. 'Normal', 'Heading1'). */
  styleId?: string | null;
  /** Font family from the block's first text run. */
  fontFamily?: string;
  /** Font size from the block's first text run. */
  fontSize?: number;
  /** True if the block's text is bold. */
  bold?: boolean;
  /** True if the block's text is underlined. */
  underline?: boolean;
  /** Text color when explicitly set in the document. */
  color?: string;
  /** Paragraph alignment. */
  alignment?: string;
  /** Heading level (1-6). Only for headings. */
  headingLevel?: number;
  /**
   * Numbering reference (`numId` + `level`) for numbered blocks, sourced from the
   * block's direct numbering properties (`w:numPr`). Present for numbered
   * headings and numbered paragraphs alike, so a numbered-heading sequence can be
   * discovered here even though those blocks resolve as `heading`, not `listItem`.
   * Absent for non-numbered blocks. Distinct from the list-rendering
   * marker/ordinal exposed on list items.
   */
  paragraphNumbering?: ParagraphNumbering;
  /** Ref handle targeting the block's full text. Pass to superdoc_format or superdoc_edit. */
  ref?: string;
}
export interface BlocksListInput {
  offset?: number;
  limit?: number;
  nodeTypes?: BlockNodeType[];
  /** Include full flattened text for each block. Omit to return textPreview only. */
  includeText?: boolean;
  /** Restrict block listing to a specific story. Omit for body (backward compatible). */
  in?: StoryLocator;
}
export interface BlocksListResult {
  total: number;
  blocks: BlockListEntry[];
  revision: string;
}
// ---------------------------------------------------------------------------
// blocks.delete
// ---------------------------------------------------------------------------
export interface BlocksDeleteInput {
  target: DeletableBlockNodeAddress;
}
export interface BlocksDeleteResult {
  success: true;
  deleted: DeletableBlockNodeAddress;
  deletedBlock?: DeletedBlockSummary;
  trackedChangeRefs?: ReceiptInsert[];
  invalidatedRefs?: AffectedRef[];
  affectedStories?: StoryLocator[];
  textRangeShifts?: TextRangeShift[];
  txId?: string;
}
// ---------------------------------------------------------------------------
// blocks.deleteRange
// ---------------------------------------------------------------------------
export interface BlocksDeleteRangeInput {
  start: BlockNodeAddress;
  end: BlockNodeAddress;
}
export interface DeletedBlockSummary {
  ordinal: number;
  nodeId: string;
  nodeType: string;
  textPreview: string | null;
}
// Re-export Receipt so consumers can reference the union for failure-only
// shapes without depending on `../types/receipt.js` directly from this file.
export type { Receipt };
export interface BlocksDeleteRangeResult {
  success: true;
  deletedCount: number;
  deletedBlocks: DeletedBlockSummary[];
  revision: {
    before: string;
    after: string;
  };
  dryRun: boolean;
}
