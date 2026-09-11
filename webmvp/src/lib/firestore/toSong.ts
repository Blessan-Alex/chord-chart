import type { FirestoreSong, Song } from "@/lib/types";

export function firestoreSongToSong(song: FirestoreSong): Song {
  return {
    id: song.id,
    title: song.title,
    originalKey: song.originalKey,
    sections: song.sections,
  };
}
