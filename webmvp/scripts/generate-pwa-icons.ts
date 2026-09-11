/**
 * Generate PNG PWA icons from public/icon.svg
 *
 *   npm run generate-pwa-icons
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

async function generateIcons(): Promise<void> {
  const svgPath = join(process.cwd(), "public", "icon.svg");
  const svg = readFileSync(svgPath);

  await sharp(svg).resize(192, 192).png().toFile(join(process.cwd(), "public", "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(join(process.cwd(), "public", "icon-512.png"));

  console.log("Wrote public/icon-192.png and public/icon-512.png");
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
