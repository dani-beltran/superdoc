import { describe, expect, it, vi } from 'vitest';
import { createFontResolver, type FontFaceRequest, type RegisterFaceResult } from '@superdoc/font-system';
import type { FontRegistry } from '@superdoc/font-system';
import { DocumentFontController } from './DocumentFontController';
import type { FontReadinessGate } from './FontReadinessGate';

class FakeRegistry {
  readonly registered: Array<{ family: string; source: string; weight?: string; style?: string }> = [];
  readonly awaited: FontFaceRequest[][] = [];
  readonly #sources = new Map<string, string>();

  register(input: {
    family: string;
    source: string;
    descriptors?: { weight?: string | number; style?: string };
  }): RegisterFaceResult {
    const weight = input.descriptors?.weight == null ? '400' : String(input.descriptors.weight);
    const style = input.descriptors?.style ?? 'normal';
    const key = `${input.family.toLowerCase()}|${weight}|${style}`;
    const existing = this.#sources.get(key);
    if (existing === input.source) return { family: input.family, status: 'unloaded', changed: false };
    if (existing !== undefined) throw new Error('already registered from a different source');
    this.#sources.set(key, input.source);
    this.registered.push({ family: input.family, source: input.source, weight, style });
    return { family: input.family, status: 'unloaded', changed: true };
  }

  async awaitFaceRequests(requests: Iterable<FontFaceRequest>): Promise<[]> {
    this.awaited.push([...requests]);
    return [];
  }

  asRegistry(): FontRegistry {
    return this as unknown as FontRegistry;
  }
}

function makeController() {
  const registry = new FakeRegistry();
  const notifyDocumentFontConfigChanged = vi.fn();
  const onDocumentFontConfigApplied = vi.fn();
  const microtasks: Array<() => void> = [];
  const gate = {
    resolveRegistry: () => registry.asRegistry(),
    notifyDocumentFontConfigChanged,
  } as unknown as FontReadinessGate;
  const resolver = createFontResolver();
  const controller = new DocumentFontController({
    resolver,
    getGate: () => gate,
    onDocumentFontConfigApplied,
    scheduleMicrotask: (callback) => {
      microtasks.push(callback);
    },
  });
  const flushMicrotasks = () => {
    while (microtasks.length) microtasks.shift()?.();
  };
  return {
    controller,
    registry,
    resolver,
    notifyDocumentFontConfigChanged,
    onDocumentFontConfigApplied,
    flushMicrotasks,
  };
}

describe('DocumentFontController', () => {
  it('coalesces same-tick add + map into one runtime config-change reflow', () => {
    const {
      controller,
      resolver,
      registry,
      notifyDocumentFontConfigChanged,
      onDocumentFontConfigApplied,
      flushMicrotasks,
    } = makeController();

    controller.add([{ family: 'Gelasio', faces: [{ source: '/fonts/Gelasio-Regular.woff2' }] }]);
    controller.map({ Georgia: 'Gelasio' });

    expect(notifyDocumentFontConfigChanged).not.toHaveBeenCalled();
    expect(registry.registered[0]).toMatchObject({
      family: 'Gelasio',
      source: 'url("/fonts/Gelasio-Regular.woff2")',
    });
    expect(resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Gelasio');

    flushMicrotasks();

    expect(onDocumentFontConfigApplied).toHaveBeenCalledTimes(1);
    expect(notifyDocumentFontConfigChanged).toHaveBeenCalledTimes(1);
  });

  it('does not reflow on an idempotent add', () => {
    const { controller, notifyDocumentFontConfigChanged, flushMicrotasks } = makeController();
    const family = { family: 'Gelasio', faces: [{ source: '/fonts/Gelasio-Regular.woff2' }] };

    controller.add([family]);
    flushMicrotasks();
    controller.add([family]);
    flushMicrotasks();

    expect(notifyDocumentFontConfigChanged).toHaveBeenCalledTimes(1);
  });

  it('applies initial config without a runtime event or reflow', () => {
    const {
      controller,
      resolver,
      registry,
      notifyDocumentFontConfigChanged,
      onDocumentFontConfigApplied,
      flushMicrotasks,
    } = makeController();

    controller.applyInitialConfig({
      families: [{ family: 'Gelasio', faces: [{ source: '/fonts/Gelasio-Regular.woff2', weight: 400 }] }],
      map: { Georgia: 'Gelasio' },
    });
    flushMicrotasks();

    expect(resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Gelasio');
    expect(registry.registered).toHaveLength(1);
    expect(onDocumentFontConfigApplied).not.toHaveBeenCalled();
    expect(notifyDocumentFontConfigChanged).not.toHaveBeenCalled();
  });

  it('reset cancels a pending runtime batch and clears mappings', () => {
    const { controller, resolver, notifyDocumentFontConfigChanged, flushMicrotasks } = makeController();

    controller.map({ Georgia: 'Gelasio' });
    controller.reset();
    flushMicrotasks();

    expect(resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Georgia');
    expect(notifyDocumentFontConfigChanged).not.toHaveBeenCalled();
  });

  it('reset followed by initial config reapplies configured mappings without stale runtime mappings', () => {
    const { controller, resolver, notifyDocumentFontConfigChanged, onDocumentFontConfigApplied, flushMicrotasks } =
      makeController();

    controller.map({ Georgia: 'Tinos', Verdana: 'Some Runtime Font' });
    controller.reset();
    controller.applyInitialConfig({ map: { Georgia: 'Gelasio' } });
    flushMicrotasks();

    expect(resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Gelasio');
    expect(resolver.resolvePrimaryPhysicalFamily('Verdana')).toBe('Verdana');
    expect(onDocumentFontConfigApplied).not.toHaveBeenCalled();
    expect(notifyDocumentFontConfigChanged).not.toHaveBeenCalled();
  });

  it('keeps mappings and runtime reflows isolated across controllers', () => {
    const docA = makeController();
    const docB = makeController();

    docA.controller.add([{ family: 'Gelasio', faces: [{ source: '/fonts/Gelasio-Regular.woff2' }] }]);
    docA.controller.map({ Georgia: 'Gelasio' });
    docB.controller.map({ Georgia: 'Tinos' });

    docA.flushMicrotasks();

    expect(docA.resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Gelasio');
    expect(docB.resolver.resolvePrimaryPhysicalFamily('Georgia')).toBe('Tinos');
    expect(docA.notifyDocumentFontConfigChanged).toHaveBeenCalledTimes(1);
    expect(docB.notifyDocumentFontConfigChanged).not.toHaveBeenCalled();

    docB.flushMicrotasks();

    expect(docA.notifyDocumentFontConfigChanged).toHaveBeenCalledTimes(1);
    expect(docB.notifyDocumentFontConfigChanged).toHaveBeenCalledTimes(1);
  });

  it('preload resolves logical families through the document resolver', async () => {
    const { controller, registry } = makeController();

    controller.applyInitialConfig({ map: { Georgia: 'Gelasio' } });
    await controller.preload(['Georgia']);

    expect(registry.awaited).toEqual([[{ family: 'Gelasio', weight: '400', style: 'normal' }]]);
  });
});
