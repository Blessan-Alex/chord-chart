import type { Timestamp } from "firebase/firestore";

import type { Key } from "@/lib/engine";

// A chord placed on a lyric line using character range indices
export type ChordMark = {
  chord: string;
  start: number;
  end: number;
  /** Legacy field kept for backward compatibility during migration. */
  position?: number;
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
  artist?: string;
  originalKey: Key;
  sections: Section[];
};

export type SongStatus = "active" | "archived";

export type SongViewMode = "chords" | "numbers";

/** Denormalized search row embedded in `songIndex` chunks. */
export type SongIndexEntry = {
  id: string;
  title: string;
  artist: string;
  key: Key;
  tags: string[];
  /** Lowercase normalized text for client-side search (title + artist + tags + lyrics). */
  searchText?: string;
  /** Epoch ms from Firestore updatedAt (fallback createdAt) for library sort. */
  updatedAtMs?: number;
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

export type ServiceType = "friday" | "sunday_morning" | "sunday_evening";

export type UserRole = "musician" | "admin";

/** Firestore `users/{uid}` document fields. */
export type UserProfile = {
  email: string;
  displayName: string;
  username?: string;
  usernameLower?: string;
  role: UserRole;
  avatarInitials?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
};

export type CreateUserProfileInput = {
  uid: string;
  email: string;
  displayName: string;
  username: string;
};

export type SessionStatus = "draft" | "published";

export type GroupMemberInfo = {
  uid: string;
  username?: string;
  displayName: string;
};

export type GroupData = {
  name: string;
  ownerId: string;
  ownerUsername?: string;
  memberIds: string[];
  members: GroupMemberInfo[];
  inviteCode: string;
  playlistCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Group = GroupData & {
  id: string;
};

export type CreateGroupInput = {
  name: string;
};

export type SessionData = {
  title: string;
  serviceType: ServiceType;
  date: Timestamp;
  songCount: number;
  status: SessionStatus;
  createdBy: string;
  ownerId: string;
  ownerUsername?: string;
  sharedWith: string[];
  sharedMembers?: GroupMemberInfo[];
  shareToken?: string;
  groupId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Session = SessionData & {
  id: string;
};

export type CreateSessionInput = {
  title: string;
  serviceType: ServiceType;
  date: Date;
  status?: SessionStatus;
  groupId?: string;
};

export type SessionSongData = {
  songId: string;
  songTitle: string;
  order: number;
  keyOverride: Key | null;
  notes: string | null;
  addedBy: string;
  addedAt: Timestamp;
};

export type SessionSong = SessionSongData & {
  id: string;
};

export type SongEditStatus = "draft" | "archived";

export type SongEditData = {
  songId: string;
  status: SongEditStatus;
  baseVersion: number;
  sections: Section[];
  originalKey: Key;
  title: string;
  notes: string | null;
  version: number;
  editedBy: string;
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
};

export type SongEdit = SongEditData & {
  id: string;
};

export type UpdateSongEditInput = Partial<
  Pick<SongEditData, "title" | "originalKey" | "sections" | "notes">
>;
