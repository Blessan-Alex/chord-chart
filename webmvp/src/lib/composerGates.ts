import type { Section } from "@/lib/types";

export function hasComposerLyrics(sections: Section[]): boolean {
  return sections.some((section) =>
    section.lines.some((line) => line.lyrics.trim() !== ""),
  );
}

export function canPersistComposer(title: string, sections: Section[]): boolean {
  return title.trim() !== "" && hasComposerLyrics(sections);
}
