import { XmlElement } from 'yjs';

const CROSS_REFERENCE_NODE_NAME = 'crossReference';

/**
 * Imported Word cross references can carry cached result runs in the shared
 * Yjs XML, but the ProseMirror node is intentionally a leaf atom. Strip only
 * those cached Yjs children before y-prosemirror hydrates the fragment.
 *
 * @param {import('yjs').XmlFragment | null | undefined} fragment
 * @returns {boolean}
 */
export function normalizeYjsFragmentForSchema(fragment) {
  if (!fragment) return false;

  let changed = false;
  const normalize = () => {
    changed = stripCrossReferenceChildren(fragment) || changed;
  };

  if (fragment.doc) {
    fragment.doc.transact(normalize);
  } else {
    normalize();
  }

  return changed;
}

/**
 * @param {import('yjs').XmlFragment | import('yjs').XmlElement} parent
 * @returns {boolean}
 */
function stripCrossReferenceChildren(parent) {
  let changed = false;

  for (const child of parent.toArray()) {
    if (!(child instanceof XmlElement)) continue;

    if (child.nodeName === CROSS_REFERENCE_NODE_NAME) {
      if (child.length > 0) {
        child.delete(0, child.length);
        changed = true;
      }
      continue;
    }

    changed = stripCrossReferenceChildren(child) || changed;
  }

  return changed;
}
