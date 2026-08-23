import { twinklePreset } from "../src/data/presets";
import { getSlotLabels } from "../src/lib/lineLabels";

const line1Labels = getSlotLabels(twinklePreset.lines[0]);
const line2Labels = getSlotLabels(twinklePreset.lines[1]);

if (line1Labels.join("|") !== "Twinkle|twinkle|little|star") {
  throw new Error(`Line 1 labels wrong: ${line1Labels.join(", ")}`);
}

if (line2Labels.join("|") !== "How|I|wonder|what") {
  throw new Error(`Line 2 labels wrong: ${line2Labels.join(", ")}`);
}

// Fallback: line without labels uses space split
const fallbackLine = {
  lyrics: "How I wonder what you are",
  slots: [{ chord: "" }, { chord: "" }, { chord: "" }, { chord: "" }],
};

const fallbackLabels = getSlotLabels(fallbackLine);
if (fallbackLabels.join("|") !== "How|I|wonder|what") {
  throw new Error(`Fallback labels wrong: ${fallbackLabels.join(", ")}`);
}

console.log("✓ Line 1:", line1Labels.join(" / "));
console.log("✓ Line 2:", line2Labels.join(" / "));
console.log("✓ Fallback space split works");
console.log("\nLine labels verification passed.");
