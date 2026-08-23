import type { Line } from "@/lib/types";

function splitByComma(lyrics: string): string[] {
  return lyrics
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
}

function splitBySpace(lyrics: string): string[] {
  return lyrics.split(/\s+/).filter(Boolean);
}

export function getSlotLabels(line: Line): string[] {
  const slotCount = line.slots.length;

  if (line.labels && line.labels.length > 0) {
    return Array.from({ length: slotCount }, (_, index) => line.labels![index] ?? "");
  }

  const commaWords = splitByComma(line.lyrics);
  if (commaWords.length >= slotCount) {
    return commaWords.slice(0, slotCount);
  }

  const spaceWords = splitBySpace(line.lyrics);
  return Array.from({ length: slotCount }, (_, index) => spaceWords[index] ?? "");
}
