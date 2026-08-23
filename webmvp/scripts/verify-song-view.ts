import { transposeSlot } from "../src/lib/engine";
import type { ChordSlot } from "../src/lib/types";

const line1Degrees = ["I", "I", "IV", "I"];
const line2Degrees = ["IV", "I", "V", "I"];

function slotsFromDegrees(degrees: string[]): ChordSlot[] {
  return degrees.map((degree) => ({
    chord: "",
    degree,
    quality: "major",
  }));
}

function lineToChords(slots: ChordSlot[], key: string): string[] {
  return slots.map((slot) => transposeSlot(slot, key).chord);
}

const line1 = slotsFromDegrees(line1Degrees);
const line2 = slotsFromDegrees(line2Degrees);

const matrix = [
  { key: "C", line1: ["C", "C", "F", "C"], line2: ["F", "C", "G", "C"] },
  { key: "G", line1: ["G", "G", "C", "G"], line2: ["C", "G", "D", "G"] },
  { key: "D", line1: ["D", "D", "G", "D"], line2: ["G", "D", "A", "D"] },
];

for (const { key, line1: expected1, line2: expected2 } of matrix) {
  const actual1 = lineToChords(line1, key);
  const actual2 = lineToChords(line2, key);

  if (actual1.join(" ") !== expected1.join(" ")) {
    throw new Error(
      `Key ${key} line 1: expected ${expected1.join(" ")}, got ${actual1.join(" ")}`,
    );
  }

  if (actual2.join(" ") !== expected2.join(" ")) {
    throw new Error(
      `Key ${key} line 2: expected ${expected2.join(" ")}, got ${actual2.join(" ")}`,
    );
  }

  console.log(`✓ Key ${key}: ${actual1.join(" ")} | ${actual2.join(" ")}`);
}

// Degrees stay fixed
for (const key of ["C", "G", "D"]) {
  line1.forEach((slot, index) => {
    const transposed = transposeSlot(slot, key);
    if (transposed.degree !== line1Degrees[index]) {
      throw new Error(`Degree changed for slot ${index} in key ${key}`);
    }
  });
}
console.log("✓ Degrees unchanged across keys");

console.log("\nSong view transpose matrix passed.");
