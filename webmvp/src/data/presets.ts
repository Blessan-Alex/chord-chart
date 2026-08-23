import type { ChordSlot, Song } from "@/lib/types";

function emptySlots(count: number): ChordSlot[] {
  return Array.from({ length: count }, () => ({ chord: "" }));
}

export const twinklePreset: Song = {
  id: "twinkle",
  title: "Twinkle Twinkle Little Star",
  originalKey: "C",
  lines: [
    {
      lyrics: "Twinkle, twinkle, little, star",
      labels: ["Twinkle", "twinkle", "little", "star"],
      slots: emptySlots(4),
    },
    {
      lyrics: "How I wonder what you are",
      labels: ["How", "I", "wonder", "what"],
      slots: emptySlots(4),
    },
  ],
};
