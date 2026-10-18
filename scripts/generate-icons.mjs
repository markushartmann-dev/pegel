// Erzeugt die PWA-Icons (PNG) aus public/icons/icon.svg.
// Aufruf: node scripts/generate-icons.mjs  (benötigt das Paket "sharp", das mit Next.js installiert wird)
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icons/icon.svg");
const out = "public/icons";

await sharp(svg).resize(192, 192).png().toFile(`${out}/icon-192.png`);
await sharp(svg).resize(512, 512).png().toFile(`${out}/icon-512.png`);
await sharp(svg).resize(180, 180).flatten({ background: "#0d1014" }).png().toFile(`${out}/apple-touch-icon.png`);
// Maskable: Motiv auf 80 % verkleinert, damit es in der sicheren Zone liegt
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0d1014" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(`${out}/icon-maskable-512.png`);
await sharp(svg).resize(96, 96).png().toFile(`${out}/badge-96.png`);
await sharp(svg).resize(32, 32).png().toFile("src/app/icon.png");
console.log("Icons erzeugt.");
