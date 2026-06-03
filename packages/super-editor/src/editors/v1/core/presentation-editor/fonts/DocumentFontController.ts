import type { FontResolver } from '@superdoc/font-system';
import type { FontReadinessGate } from './FontReadinessGate.js';

export interface DocumentFontControllerDeps {
  /**
   * This document's logical->physical resolver. The controller is its ONLY writer (map/unmap/
   * reset); PresentationEditor and `superdoc.fonts.*` route through here rather than mutating it
   * directly, so config-time and runtime changes share one orchestration path.
   */
  resolver: FontResolver;
  /**
   * The current font-readiness gate, or null before init / after teardown. A function (not the
   * gate itself) because the gate is recreated across renders and document swaps; the controller
   * always talks to the live one.
   */
  getGate: () => FontReadinessGate | null;
  /**
   * Invoked once after a mapping change is actually applied (signature changed), so the next
   * `fonts-changed` is labelled `source: 'config-change'` instead of `late-load`.
   */
  onMappingApplied: () => void;
}

/**
 * The single writer for a document's font state.
 *
 * Both config-time (`new SuperDoc({ fonts })`) and runtime (`superdoc.fonts.*`) mutations route
 * through this controller so they share one orchestration path: mutate the resolver/registry,
 * then reflow ONCE - and only when something actually changed. Mapping changes are document-local
 * (the per-document resolver signature already busts this document's measure/paint caches), so a
 * reflow goes through {@link FontReadinessGate.notifyFontMappingChanged} and never bumps the
 * global font epoch or touches other editors on the page.
 *
 * `add`/`preload` (registry-backed) land once this owns the mapping transitions.
 */
export class DocumentFontController {
  readonly #resolver: FontResolver;
  readonly #getGate: () => FontReadinessGate | null;
  readonly #onMappingApplied: () => void;

  constructor(deps: DocumentFontControllerDeps) {
    this.#resolver = deps.resolver;
    this.#getGate = deps.getGate;
    this.#onMappingApplied = deps.onMappingApplied;
  }

  /**
   * Map logical families to physical render families, e.g. `map({ Georgia: 'Gelasio' })`. Applies
   * every entry, then reflows the document ONCE - and only if the resolver signature actually
   * changed, so a redundant map (same target already set) neither reflows nor emits. The physical
   * family must be loadable (a bundled substitute, or a face registered via `add`); an
   * unmapped/unloadable target falls back at the gate. Render-only: export keeps the logical name.
   */
  map(mappings: Record<string, string>): void {
    const before = this.#resolver.signature;
    for (const [logicalFamily, physicalFamily] of Object.entries(mappings)) {
      this.#resolver.map(logicalFamily, physicalFamily);
    }
    this.#reflowIfChanged(before);
  }

  /** Remove runtime mappings; each family reverts to its bundled default (or identity). */
  unmap(families: string | string[]): void {
    const before = this.#resolver.signature;
    for (const family of Array.isArray(families) ? families : [families]) {
      this.#resolver.unmap(family);
    }
    this.#reflowIfChanged(before);
  }

  /**
   * Clear all runtime overrides (called on a document swap, so a prior document's mappings do not
   * leak into the next). No reflow here: the swap re-renders the new document from scratch.
   */
  reset(): void {
    this.#resolver.reset();
  }

  /**
   * Reflow the document once iff the signature changed since `signatureBefore`. A no-op mutation
   * (signature unchanged) must not reflow or emit. On a real change, mark the next `fonts-changed`
   * as a config change and reflow via the document-local mapping path.
   */
  #reflowIfChanged(signatureBefore: string): void {
    if (this.#resolver.signature === signatureBefore) return;
    this.#onMappingApplied();
    this.#getGate()?.notifyFontMappingChanged();
  }
}
