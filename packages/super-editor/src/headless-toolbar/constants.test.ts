import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_FAMILY_OPTIONS } from './constants';

describe('DEFAULT_FONT_FAMILY_OPTIONS (headless default font options, derived from the font-offering registry)', () => {
  it('advertises the conservative no-package baseline (logical name + logical stack)', () => {
    expect(DEFAULT_FONT_FAMILY_OPTIONS).toEqual([
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Courier New', value: 'Courier New, monospace' },
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Times New Roman', value: 'Times New Roman, serif' },
    ]);
  });

  it('drops non-advertised fonts from defaults', () => {
    const labels = new Set(DEFAULT_FONT_FAMILY_OPTIONS.map((o) => o.label));
    expect(labels.has('Aptos')).toBe(false);
    expect(labels.has('Calibri')).toBe(false);
    expect(labels.has('Cambria')).toBe(false);
    expect(labels.has('Calibri Light')).toBe(false);
    expect(labels.has('Helvetica')).toBe(false);
    expect(labels.has('Century Schoolbook')).toBe(false);
    expect(labels.has('Arial MT')).toBe(false);
    expect(labels.has('Courier')).toBe(false);
    expect(labels.has('Times')).toBe(false);
  });
});
