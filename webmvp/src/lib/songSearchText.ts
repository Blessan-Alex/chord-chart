import type { Section } from "@/lib/types";

/** Max chars per index entry search blob (Firestore chunk size budget at 10k scale). */
export const SONG_INDEX_SEARCH_TEXT_MAX = 2048;

export function flattenSectionsLyrics(sections: Section[]): string[] {
  return sections.flatMap((section) => section.lines.map((line) => line.lyrics));
}

export function buildSongSearchText(input: {
  title: string;
  artist?: string;
  tags?: string[];
  sections?: Section[];
}): string {
  const lyricLines = flattenSectionsLyrics(input.sections ?? []);
  const raw = [input.title, input.artist ?? "", ...(input.tags ?? []), ...lyricLines]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return raw.slice(0, SONG_INDEX_SEARCH_TEXT_MAX);
}
