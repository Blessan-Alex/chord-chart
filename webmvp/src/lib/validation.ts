import { ALL_KEYS, isValidChord, type Key } from "@/lib/engine";
import { getMarkEnd, getMarkStart } from "@/lib/chordMarks";
import type { ChordMark } from "@/lib/types";

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(
  username: string,
): { ok: true; normalized: string } | { ok: false; error: string } {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { ok: false, error: "Username is required" };
  }

  if (normalized.length < 3 || normalized.length > 20) {
    return { ok: false, error: "Username must be 3–20 characters" };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers, and underscores only",
    };
  }

  return { ok: true, normalized };
}

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

  const hasStartEnd =
    typeof m.start === "number" &&
    typeof m.end === "number" &&
    Number.isInteger(m.start) &&
    Number.isInteger(m.end) &&
    m.start >= 0 &&
    m.end > m.start;

  const hasLegacyPosition =
    typeof m.position === "number" &&
    Number.isInteger(m.position) &&
    m.position >= 0;

  if (!hasStartEnd && !hasLegacyPosition) {
    errors.push(`${path}: start/end or legacy position is required`);
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

    if (typeof l.lyrics === "string") {
      const lyricLength = l.lyrics.length;
      l.chords.forEach((mark, ci) => {
        if (!mark || typeof mark !== "object") {
          return;
        }
        const chordMark = mark as ChordMark;
        const start = getMarkStart(chordMark);
        const end = getMarkEnd(chordMark);
        if (start > lyricLength) {
          errors.push(
            `${path}.chords[${ci}]: start ${start} exceeds lyrics length ${lyricLength}`,
          );
        }
        if (end > lyricLength) {
          errors.push(
            `${path}.chords[${ci}]: end ${end} exceeds lyrics length ${lyricLength}`,
          );
        }
      });
    }
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

const SESSION_SERVICE_TYPES = new Set([
  "friday",
  "sunday_morning",
  "sunday_evening",
]);

const SESSION_STATUSES = new Set(["draft", "published"]);

export function validateSession(
  session: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!session || typeof session !== "object") {
    return { ok: false, errors: ["Session must be an object"] };
  }

  const s = session as Record<string, unknown>;

  if (typeof s.title !== "string" || !s.title.trim()) {
    errors.push("title is required");
  }

  if (
    typeof s.serviceType !== "string" ||
    !SESSION_SERVICE_TYPES.has(s.serviceType)
  ) {
    errors.push("serviceType must be friday, sunday_morning, or sunday_evening");
  }

  if (typeof s.status !== "string" || !SESSION_STATUSES.has(s.status)) {
    errors.push("status must be draft or published");
  }

  if (typeof s.songCount !== "number" || s.songCount < 0) {
    errors.push("songCount must be a non-negative number");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
