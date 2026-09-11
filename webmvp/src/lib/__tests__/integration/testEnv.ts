import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const RULES_PATH = join(process.cwd(), "..", "firestore.rules");
const PROJECT_ID = "song-db-test";

export const emulatorEnabled =
  process.env.VITEST_INTEGRATION === "true" &&
  Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export async function createRulesTestEnvironment(): Promise<RulesTestEnvironment> {
  const rules = readFileSync(RULES_PATH, "utf8");

  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

export const sampleSongSections = [
  {
    label: "Verse 1",
    lines: [
      {
        lyrics: "Hello world",
        chords: [{ chord: "C", position: 0 }],
      },
    ],
  },
];
