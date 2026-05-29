import { test, expect } from '@playwright/test';

/**
 * Smart-tags authoring: clicking a tag chip in the sidebar inserts a matching
 * inline SDT at the caret (dogfoods ui.selection.capture + create.contentControl
 * + ui.contentControls.focus). The inserted field carries the field's tag and
 * the token text, and paints with the same .superdoc-structured-content-inline
 * wrapper the chips are styled to match.
 *
 * Runs only for the contract-templates demo (the shared suite runs once per DEMO).
 */

test('clicking a Smart-tags chip inserts a matching inline SDT at the caret', async ({ page }) => {
  test.skip(process.env.DEMO !== 'contract-templates', 'contract-templates demo only');

  await page.route('**/ingest.superdoc.dev/**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__demo?.state?.ui?.contentControls?.getSnapshot()?.items?.length > 0,
    null,
    { timeout: 30_000 },
  );
  await page.waitForSelector('[data-tag-key]');

  // Place a caret in the document body so capture() has an insertion point.
  await page.evaluate(() => {
    (window as any).__demo.superdoc.activeEditor.commands?.setTextSelection?.({ from: 6, to: 6 });
  });

  const key = await page.getAttribute('[data-tag-key]', 'data-tag-key');
  expect(key).toBeTruthy();

  // Count existing controls with this tag, then click the chip and expect one more.
  const tag = JSON.stringify({ kind: 'smartField', key });
  const token = key!.replace(/([A-Z])/g, '_$1').toUpperCase();

  const textsForTag = () =>
    page.evaluate((t) => {
      const ed = (window as any).__demo.superdoc.activeEditor;
      const out: string[] = [];
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === 'structuredContent' && node.attrs?.tag === t) out.push(node.textContent);
        return true;
      });
      return out;
    }, tag);

  const before = await textsForTag();
  await page.click(`[data-tag-key="${key}"]`);

  // A new inline SDT carrying this tag + token text should appear.
  await expect
    .poll(async () => (await textsForTag()).filter((x) => x === token).length, { timeout: 6_000 })
    .toBeGreaterThan(before.filter((x) => x === token).length);
});

test('clicking an in-editor smart-field token highlights its sidebar chip', async ({ page }) => {
  test.skip(process.env.DEMO !== 'contract-templates', 'contract-templates demo only');

  await page.route('**/ingest.superdoc.dev/**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__demo?.state?.ui?.contentControls?.getSnapshot()?.items?.length > 0,
    null,
    { timeout: 30_000 },
  );
  await page.waitForSelector('[data-tag-key]');

  const sel = '.superdoc-structured-content-inline[data-sdt-tag*="smartField"]';
  await page.waitForSelector(sel);
  // The key of the first painted inline smart-field token in the document.
  const key = await page.evaluate((s) => {
    const el = document.querySelector(s);
    try {
      return JSON.parse(el?.getAttribute('data-sdt-tag') ?? '{}').key ?? null;
    } catch {
      return null;
    }
  }, sel);
  expect(key).toBeTruthy();

  // Click the token in the document; its sidebar chip should become active.
  await page.locator(sel).first().click();
  await expect
    .poll(
      async () =>
        page.evaluate(
          (k) => document.querySelector(`.smart-tag[data-tag-key="${k}"]`)?.classList.contains('is-active') ?? false,
          key,
        ),
      { timeout: 5_000 },
    )
    .toBe(true);
});

test('a smart-field pill does not shift its box on hover or click (no jitter)', async ({ page }) => {
  test.skip(process.env.DEMO !== 'contract-templates', 'contract-templates demo only');

  await page.route('**/ingest.superdoc.dev/**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__demo?.state?.ui?.contentControls?.getSnapshot()?.items?.length > 0,
    null,
    { timeout: 30_000 },
  );
  const sel = '.superdoc-structured-content-inline[data-sdt-tag*="smartField"]';
  await page.waitForSelector(sel);

  // Under chrome:'none' SuperDoc resets the field's border/fill on hover and on
  // selectednode; the demo re-asserts them to keep the box. Guard that the box
  // and border stay constant across rest -> hover -> click, so it never moves.
  const box = () =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), border: getComputedStyle(el).borderTopWidth };
    }, sel);

  const rest = await box();
  await page.locator(sel).first().hover();
  await page.waitForTimeout(250);
  const hovered = await box();
  await page.locator(sel).first().click();
  await page.waitForTimeout(250);
  const clicked = await box();

  for (const state of [hovered, clicked]) {
    expect(state.border).toBe('1px');
    expect(Math.abs(state.w - rest.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(state.h - rest.h)).toBeLessThanOrEqual(1);
  }
});

test('a block clause keeps its amber left rail and box across hover/select (no jitter)', async ({ page }) => {
  test.skip(process.env.DEMO !== 'contract-templates', 'contract-templates demo only');

  await page.route('**/ingest.superdoc.dev/**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__demo?.state?.ui?.contentControls?.getSnapshot()?.items?.length > 0,
    null,
    { timeout: 30_000 },
  );
  const sel = '.superdoc-structured-content-block[data-sdt-tag*="reusableSection"]';
  await page.waitForSelector(sel);

  // Block SDTs strip border + fill on .sdt-group-hover / .ProseMirror-selectednode;
  // the demo overrides them. Guard the 4px amber left rail and box stay constant.
  const box = () =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement;
      const r = el.getBoundingClientRect();
      return { rail: getComputedStyle(el).borderLeftWidth, w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);

  const rest = await box();
  expect(rest.rail).toBe('4px');
  await page.locator(sel).first().hover();
  await page.waitForTimeout(250);
  const hovered = await box();
  await page.locator(sel).first().click();
  await page.waitForTimeout(250);
  const clicked = await box();

  for (const state of [hovered, clicked]) {
    expect(state.rail).toBe('4px');
    expect(Math.abs(state.w - rest.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(state.h - rest.h)).toBeLessThanOrEqual(1);
  }
});
