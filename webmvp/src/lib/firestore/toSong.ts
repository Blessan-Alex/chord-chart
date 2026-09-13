import { normalizeSections } from "@/lib/chordMarks";
import type { FirestoreSong, Song } from "@/lib/types";

export function firestoreSongToSong(song: FirestoreSong): Song {
  return {
    id: song.id,
    title: song.title,
    originalKey: song.originalKey,
    sections: normalizeSections(song.sections),
  };
}
