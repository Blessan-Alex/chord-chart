// ═══════════════════════════════════════════════════════
// 12-Semitone Transposition Engine
//
// Core algorithm:
//   interval = noteToNum(toKey) - noteToNum(fromKey)
//   newRoot  = (oldRoot + interval) % 12
//
// That's it. Everything else is parsing and spelling.
// ═══════════════════════════════════════════════════════

// ── Note ↔ Number ──

const NOTE_TO_NUM: Record<string, number> = {
  "C": 0, "B#": 0,
  "C#": 1, "Db": 1,
  "D": 2,
  "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4,
  "F": 5, "E#": 5,
  "F#": 6, "Gb": 6,
  "G": 7,
  "G#": 8, "Ab": 8,
  "A": 9,
  "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11,
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);

export const ALL_KEYS = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const;

export type Key = (typeof ALL_KEYS)[number];

function noteToNum(note: string): number {
  const n = NOTE_TO_NUM[note];
  if (n === undefined) throw new Error(`Unknown note: ${note}`);
  return n;
}

/** Number → note name, spelled correctly for the target key. */
function spellNote(semitone: number, targetKey: string): string {
  const n = ((semitone % 12) + 12) % 12;
  return FLAT_KEYS.has(targetKey) ? FLAT_NAMES[n] : SHARP_NAMES[n];
}

// ── Chord Parser ──

export type ParsedChord = {
  rootNum: number;
  suffix: string; // "m7", "maj7", "sus4", "dim", "" etc.
  bassNum?: number; // slash bass, e.g. C/E → bassNum = 4
};

const CHORD_RE = /^([A-Ga-g][#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$/;

export function parseChord(input: string): ParsedChord {
  const m = input.trim().match(CHORD_RE);
  if (!m) throw new Error(`Invalid chord: ${input}`);

  const root = m[1][0].toUpperCase() + m[1].slice(1);
  const rootNum = NOTE_TO_NUM[root];
  if (rootNum === undefined) throw new Error(`Unknown root: ${root}`);

  const suffix = m[2] || "";

  let bassNum: number | undefined;
  if (m[3]) {
    const bass = m[3][0].toUpperCase() + m[3].slice(1);
    bassNum = NOTE_TO_NUM[bass];
    if (bassNum === undefined) throw new Error(`Unknown bass: ${bass}`);
  }

  return { rootNum, suffix, bassNum };
}

export function isValidChord(input: string): boolean {
  try {
    parseChord(input);
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════
// CORE: Transpose a chord string
// ══════════════════════════════════════════

export function transposeChord(
  chord: string,
  fromKey: string,
  toKey: string,
): string {
  const trimmed = chord.trim();
  if (!trimmed) return "";
  if (fromKey === toKey) return trimmed;

  const interval = (noteToNum(toKey) - noteToNum(fromKey) + 12) % 12;
  const { rootNum, suffix, bassNum } = parseChord(trimmed);

  let result = spellNote(rootNum + interval, toKey) + suffix;

  if (bassNum !== undefined) {
    result += "/" + spellNote(bassNum + interval, toKey);
  }

  return result;
}

// ── Nashville number system (1–7, minors as 6m etc.) ──

const INTERVAL_TO_NUMBER = [
  "1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7",
];

/**
 * Returns the Nashville number of a chord relative to a key.
 * Minor chords append "m" (e.g. Am in C → "6m"). Dim → "dim", aug → "+".
 */
export function chordToDegree(chord: string, key: string): string {
  const trimmed = chord.trim();
  if (!trimmed) return "";

  const { rootNum, suffix } = parseChord(trimmed);
  const interval = ((rootNum - noteToNum(key)) % 12 + 12) % 12;
  let degree = INTERVAL_TO_NUMBER[interval];

  const low = suffix.toLowerCase();
  if (low.startsWith("m") && !low.startsWith("maj")) {
    degree += "m";
  } else if (low.startsWith("dim") || low === "°") {
    degree += "dim";
  } else if (low.startsWith("aug") || low === "+") {
    degree += "+";
  }

  return degree;
}

// ── Diatonic chord palette ──

const DIATONIC_TRIADS = [
  { interval: 0, quality: "" },
  { interval: 5, quality: "" },
  { interval: 7, quality: "" },
  { interval: 9, quality: "m" },
  { interval: 2, quality: "m" },
  { interval: 4, quality: "m" },
] as const;

/** Returns 6 diatonic triads for a major key: I, IV, V, vi, ii, iii. */
export function getDiatonicChords(key: Key): string[] {
  const rootNum = noteToNum(key);
  return DIATONIC_TRIADS.map(({ interval, quality }) =>
    spellNote(rootNum + interval, key) + quality,
  );
}
