import { ALL_KEYS, isValidChord, type Key } from "@/lib/engine";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

function validateChordMark(mark: unknown, path: string, errors: string[]): void {
  if (!mark || typeof mark !== "object") {
    errors.push(`${path}: chord mark must be an object`);
    return;
  }

  const m = mark as Record<string, unknown>;

  if (typeof m.chord !== "string" || !m.chord.trim()) {
    errors.push(`${path}: chord is required`);
  } else if (!isValidChord(m.chord)) {
    errors.push(`${path}: invalid chord "${m.chord}"`);
  }

  if (typeof m.position !== "number" || !Number.isInteger(m.position) || m.position < 0) {
    errors.push(`${path}: position must be a non-negative integer`);
  }
}

function validateLyricLine(line: unknown, path: string, errors: string[]): void {
  if (!line || typeof line !== "object") {
    errors.push(`${path}: line must be an object`);
    return;
  }

  const l = line as Record<string, unknown>;

  if (typeof l.lyrics !== "string") {
    errors.push(`${path}: lyrics must be a string`);
  }

  if (!Array.isArray(l.chords)) {
    errors.push(`${path}: chords must be an array`);
  } else {
    l.chords.forEach((mark, ci) => {
      validateChordMark(mark, `${path}.chords[${ci}]`, errors);
    });
  }
}

function validateSection(section: unknown, index: number, errors: string[]): void {
  const path = `sections[${index}]`;

  if (!section || typeof section !== "object") {
    errors.push(`${path}: section must be an object`);
    return;
  }

  const s = section as Record<string, unknown>;

  if (typeof s.label !== "string" || !s.label.trim()) {
    errors.push(`${path}: label is required`);
  }

  if (!Array.isArray(s.lines)) {
    errors.push(`${path}: lines must be an array`);
  } else {
    s.lines.forEach((line, li) => {
      validateLyricLine(line, `${path}.lines[${li}]`, errors);
    });
  }
}

export function validateSong(
  song: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!song || typeof song !== "object") {
    return { ok: false, errors: ["Song must be an object"] };
  }

  const s = song as Record<string, unknown>;

  if (typeof s.id !== "string") {
    errors.push("id must be a string");
  }

  if (typeof s.title !== "string" || !s.title.trim()) {
    errors.push("title is required");
  }

  if (typeof s.originalKey !== "string" || !isKey(s.originalKey)) {
    errors.push("originalKey must be one of the 12 major keys");
  }

  if (!Array.isArray(s.sections)) {
    errors.push("sections must be an array");
  } else {
    s.sections.forEach((section, si) => {
      validateSection(section, si, errors);
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
