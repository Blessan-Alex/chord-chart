import type { Key } from "@/lib/engine";

// A chord placed at a character position in a lyric line
export type ChordMark = {
  chord: string; // e.g. "Am7", "G/B", "Dsus4"
  position: number; // character index in the lyric text
};

// A lyric line with chords positioned above it
export type LyricLine = {
  lyrics: string; // full lyric text
  chords: ChordMark[]; // chords at specific character positions
};

// A section of a song (verse, chorus, bridge, etc.)
export type Section = {
  label: string; // "Intro", "Verse 1", "Chorus", "Bridge"
  lines: LyricLine[];
};

// The song
export type Song = {
  id: string;
  title: string;
  originalKey: Key;
  sections: Section[];
};
