import { test, expect } from '@playwright/test';

/**
 * Demo smoke for the contract-templates "Locate" affordance (dogfoods
 * `ui.contentControls.scrollIntoView`): clicking a lower clause's Locate
 * button scrolls that control's painted element into view.
 *
 * The shared suite runs once per DEMO, so this skips for every other demo.
 */

// A short viewport so the bottom clause starts below the fold.
test.use({ viewport: { width: 1100, height: 520 } });

test('clicking a lower clause Locate scrolls its content control into view', async ({ page }) => {
  test.skip(process.env.DEMO !== 'contract-templates', 'contract-templates demo only');

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route('**/ingest.superdoc.dev/**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '{}' }),
  );

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

  // Wait until SuperDoc has imported the fixture and the UI handle sees controls.
  await page.waitForFunction(
    () => {
      const ui = (window as unknown as { __demo?: { state?: { ui?: unknown } } }).__demo?.state?.ui as
        | { contentControls: { getSnapshot(): { items: unknown[] } } }
        | undefined;
      return !!ui && ui.contentControls.getSnapshot().items.length > 0;
    },
    null,
    { timeout: 30_000 },
  );

  // Locate buttons on clause cards live in the (initially hidden) clauses panel.
  await page.click('.tab[data-tab="clauses"]');
  await page.waitForSelector('[data-locate-clause]');

  // Resolve the bottom-most block clause: its painted id (data-sdt-id) and its
  // sectionId (= the Locate button's data-locate-clause).
  const target = await page.evaluate(() => {
    const ui = (window as unknown as { __demo: { state: { ui: { contentControls: { getSnapshot(): { items: Array<{ id: string; kind: string; properties?: { tag?: string } }> } } } } } }).__demo.state.ui;
    const items = ui.contentControls.getSnapshot().items;
    const blocks = items.filter((i) => i.kind === 'block');
    const last = blocks[blocks.length - 1];
    let sectionId: string | null = null;
    try {
      sectionId = JSON.parse(last?.properties?.tag ?? '{}').sectionId ?? null;
    } catch {
      sectionId = null;
    }
    return { id: last?.id ?? null, sectionId };
  });
  expect(target.id).toBeTruthy();
  expect(target.sectionId).toBeTruthy();

  const inViewport = () =>
    page.evaluate((id) => {
      const el = document.querySelector(`[data-sdt-id="${id}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top <= window.innerHeight;
    }, target.id);

  // The bottom clause starts off-screen.
  expect(await inViewport()).toBe(false);

  // Click its Locate button; the document should scroll it into view.
  await page.click(`[data-locate-clause="${target.sectionId}"]`);
  await expect.poll(inViewport, { timeout: 5_000 }).toBe(true);

  expect(errors).toEqual([]);
});
