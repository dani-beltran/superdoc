import { describe, expect, it } from 'vitest';
import { exportSchemaToJson } from '../../../../exporter.js';

describe('smartTag export routing (SD-2647)', () => {
  it('routes a smartTag PM node through exportSchemaToJson to <w:smartTag>', () => {
    const node = {
      type: 'smartTag',
      attrs: { element: 'country-region', uri: 'urn:schemas-microsoft-com:office:smarttags' },
      content: [{ type: 'run', attrs: {}, content: [{ type: 'text', text: 'Brazil' }] }],
    };

    const result = exportSchemaToJson({ node });

    expect(result).not.toBeNull();
    expect(result?.name).toBe('w:smartTag');
    expect(result?.attributes?.['w:element']).toBe('country-region');
    expect(result?.attributes?.['w:uri']).toBe('urn:schemas-microsoft-com:office:smarttags');
  });

  it('preserves the captured w:smartTagPr when re-emitting through exportSchemaToJson', () => {
    const smartTagPr = {
      type: 'element',
      name: 'w:smartTagPr',
      elements: [
        {
          type: 'element',
          name: 'w:attr',
          attributes: { 'w:name': 'CountryRegion', 'w:val': 'BR' },
        },
      ],
    };

    const node = {
      type: 'smartTag',
      attrs: { element: 'country-region', uri: null, smartTagPr },
      content: [{ type: 'run', attrs: {}, content: [{ type: 'text', text: 'Brazil' }] }],
    };

    const result = exportSchemaToJson({ node });

    expect(result?.name).toBe('w:smartTag');
    const firstChild = result?.elements?.[0];
    expect(firstChild?.name).toBe('w:smartTagPr');
    expect(firstChild?.elements?.[0]?.name).toBe('w:attr');
    expect(firstChild?.elements?.[0]?.attributes?.['w:val']).toBe('BR');
  });
});
