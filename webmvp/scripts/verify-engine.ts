import {
  chordFromDegree,
  chordToDegree,
  transposeChords,
} from "../src/lib/engine";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`✓ ${label}`);
}

assertEqual(chordToDegree("C", "C"), "I", "C in key C → I");
assertEqual(chordToDegree("F", "C"), "IV", "F in key C → IV");
assertEqual(chordToDegree("G", "C"), "V", "G in key C → V");
assertEqual(chordFromDegree("I", "major", "G"), "G", "I in key G → G");
assertEqual(chordFromDegree("IV", "major", "G"), "C", "IV in key G → C");
assertEqual(chordFromDegree("V", "major", "G"), "D", "V in key G → D");

const transposed = transposeChords(["C", "C", "F", "C"], "C", "G");
const expected = ["G", "G", "C", "G"];
if (transposed.join(" ") !== expected.join(" ")) {
  throw new Error(
    `Line transpose: expected ${expected.join(" ")}, got ${transposed.join(" ")}`,
  );
}
console.log("✓ Line C C F C transposed to G → G G C G");

console.log("\nAll engine checks passed.");
