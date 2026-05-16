import { test, expect } from '../../fixtures/superdoc.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test.use({ config: { toolbar: 'full', showSelection: true } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SD-2767 Wave 3 coverage gap: a table whose `w:bidiVisual` comes from the
// style cascade (NOT inline on the table itself). The fixture defines a
// custom table style with `w:bidiVisual` set, and the table references that
// style via `w:tblStyle` with no inline `w:bidiVisual` override.
//
// Per ECMA-376 §17.4.1, `w:bidiVisual` flips the visual order of cells:
// logical first cell renders on the visual right, logical last on the
// visual left. The style cascade must resolve this the same way as inline
// `w:bidiVisual` would.
//
// Word confirms `Document.Tables(1).TableDirection === 1` (wdTableDirectionRtl)
// when opening this fixture, even though `document.xml` has no inline
// `w:bidiVisual`. SuperDoc must match.

test('RTL bidiVisual table inherited from a table style renders logical first cell on the visual right', async ({
  superdoc,
}) => {
  await superdoc.loadDocument(path.resolve(__dirname, 'fixtures/rtl-style-derived-bidivisual.docx'));
  await superdoc.waitForStable();

  // Fixture: 1x3 table, logical cells A B C, style-set `bidiVisual`.
  // Expected visual order (right to left): A B C.
  // Expected visual order (left to right): C B A.
  const cellLayout = await superdoc.page.evaluate(() => {
    const fragment = document.querySelector('.superdoc-table-fragment');
    if (!fragment) return null;
    const fragRect = fragment.getBoundingClientRect();

    // Find all rendered cells. The painter positions cells absolutely within
    // the fragment with left offsets that reflect their visual order.
    const cells = Array.from(fragment.children).filter((el) => (el as HTMLElement).style?.position === 'absolute');
    if (cells.length === 0) return null;

    return cells
      .map((cell) => {
        const rect = (cell as HTMLElement).getBoundingClientRect();
        return {
          text: (cell.textContent ?? '').trim(),
          relLeft: rect.left - fragRect.left,
        };
      })
      .filter((c) => c.text === 'A' || c.text === 'B' || c.text === 'C')
      .sort((a, b) => a.relLeft - b.relLeft);
  });

  expect(cellLayout).not.toBeNull();
  if (!cellLayout) return;

  // Three cells found, in left-to-right visual order.
  expect(cellLayout).toHaveLength(3);

  // RTL via style cascade: visual L-to-R order should be C, B, A.
  // If the style cascade is direction-blind, cells would render A, B, C and
  // this assertion would fail.
  expect(cellLayout.map((c) => c.text)).toEqual(['C', 'B', 'A']);
});
