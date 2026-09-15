import type { Section } from "@/lib/types";

/** Max chars per index entry search blob (fits ~2000 entries under Firestore 1 MiB/chunk). */
export const SONG_INDEX_SEARCH_TEXT_MAX = 512;

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
