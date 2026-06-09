import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_FAMILY_OPTIONS } from './constants';

describe('DEFAULT_FONT_FAMILY_OPTIONS (headless default font options, derived from the font-offering registry)', () => {
  it('advertises bundled defaults and bundled qualified choices (logical name + logical stack)', () => {
    expect(DEFAULT_FONT_FAMILY_OPTIONS).toEqual([
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Calibri', value: 'Calibri, sans-serif' },
      { label: 'Cooper Black', value: 'Cooper Black, serif' },
      { label: 'Courier New', value: 'Courier New, monospace' },
      { label: 'Helvetica', value: 'Helvetica, sans-serif' },
      { label: 'Times New Roman', value: 'Times New Roman, serif' },
    ]);
  });

  it('drops non-advertised fonts from defaults', () => {
    const labels = new Set(DEFAULT_FONT_FAMILY_OPTIONS.map((o) => o.label));
    expect(labels.has('Aptos')).toBe(false);
    expect(labels.has('Georgia')).toBe(false);
    expect(labels.has('Garamond')).toBe(false);
    expect(labels.has('Comic Sans MS')).toBe(false);
    expect(labels.has('Tahoma')).toBe(false);
    expect(labels.has('Trebuchet MS')).toBe(false);
  });
});
