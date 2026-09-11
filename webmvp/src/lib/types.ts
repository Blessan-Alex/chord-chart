import type { Timestamp } from "firebase/firestore";

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

// Minimal song shape used by the chart UI and localStorage
export type Song = {
  id: string;
  title: string;
  originalKey: Key;
  sections: Section[];
};

export type SongStatus = "active" | "archived";

/** Denormalized search row embedded in `songIndex` chunks. */
export type SongIndexEntry = {
  id: string;
  title: string;
  artist: string;
  key: Key;
  tags: string[];
};

/** `songIndex/{chunkId}` document shape. */
export type SongIndexChunk = {
  entries: SongIndexEntry[];
  updatedAt: Timestamp;
};

/** Firestore `songs/{songId}` document fields. */
export type FirestoreSongData = {
  title: string;
  artist: string;
  originalKey: Key;
  status: SongStatus;
  tempo: number | null;
  tags: string[];
  sections: Section[];
  ccli: string | null;
  copyright: string | null;
  notes: string | null;
  version: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FirestoreSong = FirestoreSongData & {
  id: string;
};

/** Admin create payload — `id` optional (defaults to slug from title). */
export type CreateSongInput = {
  id?: string;
  title: string;
  originalKey: Key;
  sections: Section[];
  artist?: string;
  tempo?: number | null;
  tags?: string[];
  ccli?: string | null;
  copyright?: string | null;
  notes?: string | null;
};

export type UpdateSongInput = Partial<
  Pick<
    CreateSongInput,
    | "title"
    | "originalKey"
    | "sections"
    | "artist"
    | "tempo"
    | "tags"
    | "ccli"
    | "copyright"
    | "notes"
  >
>;
