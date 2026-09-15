/** DOM helpers for aligning chords to rendered lyric text (all scripts). */

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function locateTextOffset(
  nodes: Text[],
  charIndex: number,
): { node: Text; offset: number } | null {
  let remaining = charIndex;

  for (const node of nodes) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      return { node, offset: remaining };
    }
    remaining -= length;
  }

  const last = nodes[nodes.length - 1];
  if (last) {
    return { node: last, offset: last.textContent?.length ?? 0 };
  }

  return null;
}

/** Build a DOM Range covering string offsets `[start, end)` inside an element. */
export function createLyricRange(
  element: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const nodes = collectTextNodes(element);
  if (nodes.length === 0) {
    return null;
  }

  const startLoc = locateTextOffset(nodes, start);
  const endLoc = locateTextOffset(nodes, end);
  if (!startLoc || !endLoc) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startLoc.node, startLoc.offset);
  range.setEnd(endLoc.node, endLoc.offset);
  return range;
}

/** Horizontal pixel offset of a character index relative to the lyric element. */
export function measureLyricCharOffset(
  element: HTMLElement,
  charIndex: number,
): number | null {
  const range = createLyricRange(element, charIndex, charIndex);
  if (!range) {
    return null;
  }

  const elementRect = element.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();
  return rangeRect.left - elementRect.left;
}

/** Measure chord anchor positions for the given start indices. */
export function measureChordOffsets(
  element: HTMLElement,
  indices: number[],
): Record<number, number> {
  const offsets: Record<number, number> = {};

  for (const index of indices) {
    const measured = measureLyricCharOffset(element, index);
    if (measured !== null) {
      offsets[index] = measured;
    }
  }

  return offsets;
}
