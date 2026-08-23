import type { ChordSlot } from "@/lib/types";

export const MAJOR_KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type MajorKey = (typeof MAJOR_KEYS)[number];

export type ParsedChord = {
  root: string;
  quality: "major";
};

const CHROMATIC: readonly string[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

const DEGREE_TO_INDEX: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
};

const INDEX_TO_DEGREE = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

function assertMajorKey(key: string): asserts key is MajorKey {
  if (!MAJOR_KEYS.includes(key as MajorKey)) {
    throw new Error(`Unsupported key: ${key}`);
  }
}

function noteToSemitone(note: string): number {
  const semitone = NOTE_TO_SEMITONE[note];
  if (semitone === undefined) {
    throw new Error(`Unsupported note: ${note}`);
  }
  return semitone;
}

function getMajorScale(key: MajorKey): string[] {
  const rootIndex = noteToSemitone(key);
  return MAJOR_INTERVALS.map(
    (interval) => CHROMATIC[(rootIndex + interval) % 12],
  );
}

function normalizeRoot(letter: string, accidental: string): string {
  const note = `${letter.toUpperCase()}${accidental}`;
  if (NOTE_TO_SEMITONE[note] === undefined) {
    throw new Error(`Invalid chord root: ${note}`);
  }

  const semitone = noteToSemitone(note);
  const canonical = CHROMATIC[semitone];
  return canonical;
}

export function parseBasicChord(input: string): ParsedChord {
  const trimmed = input.trim();
  const match = trimmed.match(/^([A-Ga-g])([#b]?)$/);

  if (!match) {
    throw new Error(`Invalid chord: ${input}`);
  }

  const root = normalizeRoot(match[1], match[2]);
  return { root, quality: "major" };
}

export function chordToDegree(chord: string, originalKey: string): string {
  assertMajorKey(originalKey);
  const { root } = parseBasicChord(chord);
  const scale = getMajorScale(originalKey);
  const rootSemitone = noteToSemitone(root);

  const degreeIndex = scale.findIndex(
    (scaleNote) => noteToSemitone(scaleNote) === rootSemitone,
  );

  if (degreeIndex === -1) {
    throw new Error(`Chord ${chord} is not diatonic in key ${originalKey}`);
  }

  return INDEX_TO_DEGREE[degreeIndex];
}

export function chordFromDegree(
  degree: string,
  quality: string,
  targetKey: string,
): string {
  assertMajorKey(targetKey);

  if (quality !== "major") {
    throw new Error(`Unsupported quality: ${quality}`);
  }

  const normalizedDegree = degree.toUpperCase();
  const degreeIndex = DEGREE_TO_INDEX[normalizedDegree];

  if (degreeIndex === undefined) {
    throw new Error(`Unsupported degree: ${degree}`);
  }

  const scale = getMajorScale(targetKey);
  return scale[degreeIndex];
}

export function transposeSlot(slot: ChordSlot, targetKey: string): ChordSlot {
  if (!slot.degree) {
    return slot;
  }

  const quality = slot.quality ?? "major";
  const chord = chordFromDegree(slot.degree, quality, targetKey);

  return {
    ...slot,
    chord,
  };
}

export function transposeChords(
  chords: string[],
  originalKey: string,
  targetKey: string,
): string[] {
  return chords.map((chord) => {
    const degree = chordToDegree(chord, originalKey);
    return chordFromDegree(degree, "major", targetKey);
  });
}
