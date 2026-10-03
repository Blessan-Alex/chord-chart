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
  /** Second full chord after `/` when slash means “either” (e.g. E/Am). */
  alternate?: string;
};

const ROOT_SUFFIX_RE = /^([A-Ga-g][#b]?)(.*)$/;

function parseNoteToken(note: string): number {
  const spelled = note[0].toUpperCase() + note.slice(1);
  const num = NOTE_TO_NUM[spelled];
  if (num === undefined) {
    throw new Error(`Unknown note: ${note}`);
  }
  return num;
}

function parseRootAndSuffix(input: string): ParsedChord {
  const m = input.trim().match(ROOT_SUFFIX_RE);
  if (!m) {
    throw new Error(`Invalid chord: ${input}`);
  }

  const root = m[1][0].toUpperCase() + m[1].slice(1);
  const rootNum = NOTE_TO_NUM[root];
  if (rootNum === undefined) {
    throw new Error(`Unknown root: ${root}`);
  }

  return { rootNum, suffix: m[2] || "" };
}

/** True when the token after `/` is a bass note, not a chord (e.g. E in C/E). */
function isBassNoteToken(token: string): boolean {
  return /^[A-Ga-g][#b]?$/u.test(token.trim());
}

export function parseChord(input: string): ParsedChord {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error(`Invalid chord: ${input}`);
  }

  const slashAt = trimmed.indexOf("/");
  if (slashAt === -1) {
    return parseRootAndSuffix(trimmed);
  }

  const head = trimmed.slice(0, slashAt);
  const tail = trimmed.slice(slashAt + 1);
  if (!tail) {
    throw new Error(`Invalid chord: ${input}`);
  }

  const parsed = parseRootAndSuffix(head);

  if (isBassNoteToken(tail)) {
    parsed.bassNum = parseNoteToken(tail);
    return parsed;
  }

  parseRootAndSuffix(tail);
  parsed.alternate = tail;
  return parsed;
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
  const parsed = parseChord(trimmed);

  let result = spellNote(parsed.rootNum + interval, toKey) + parsed.suffix;

  if (parsed.alternate) {
    return `${result}/${transposeChord(parsed.alternate, fromKey, toKey)}`;
  }

  if (parsed.bassNum !== undefined) {
    result += "/" + spellNote(parsed.bassNum + interval, toKey);
  }

  return result;
}

// ── Nashville number system (1–7, minors as 6m etc.) ──

const INTERVAL_TO_NUMBER = [
  "1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7",
];

function noteToDegree(noteNum: number, key: string): string {
  const interval = ((noteNum - noteToNum(key)) % 12 + 12) % 12;
  return INTERVAL_TO_NUMBER[interval];
}

/** Append parsed chord suffix in Nashville form (1m7, 1maj7, 1sus4, 1dim, 1aug, …). */
function suffixToNashville(suffix: string): string {
  if (!suffix) {
    return "";
  }

  const low = suffix.toLowerCase();

  if (low.startsWith("m") && !low.startsWith("maj")) {
    return suffix;
  }

  if (low.startsWith("dim") || low === "°") {
    return low === "°" ? "dim" : suffix;
  }

  if (low.startsWith("aug") || low === "+") {
    return low === "+" ? "aug" : suffix;
  }

  return suffix;
}

/**
 * Returns the Nashville number of a chord relative to a key.
 * Supports extensions (7, maj7, sus4, add9, dim, aug, …) and slash bass (1/3).
 */
export function chordToDegree(chord: string, key: string): string {
  const trimmed = chord.trim();
  if (!trimmed) return "";

  const parsed = parseChord(trimmed);
  let degree =
    noteToDegree(parsed.rootNum, key) + suffixToNashville(parsed.suffix);

  if (parsed.alternate) {
    return `${degree}/${chordToDegree(parsed.alternate, key)}`;
  }

  if (parsed.bassNum !== undefined) {
    degree += `/${noteToDegree(parsed.bassNum, key)}`;
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
