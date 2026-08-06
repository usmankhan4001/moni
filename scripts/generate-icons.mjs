// Generate PWA icons (192, 512, maskable) from the brand mark.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="10" fill="#1B2340"/>
      <circle cx="32" cy="32" r="21" fill="none" stroke="#C8963E" stroke-width="3"/>
      <circle cx="32" cy="32" r="17" fill="none" stroke="#C8963E" stroke-width="1" opacity="0.5"/>
      <text x="32" y="41" font-family="Georgia, serif" font-size="26" fill="#FDFCFA" text-anchor="middle">H</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, `icon-${size}.png`));
  console.log(`generated icon-${size}.png`);
}
console.log("done");