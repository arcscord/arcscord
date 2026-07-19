import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Generates the public brand assets from the source masters in `assets/`.
// Declarative on purpose: each output is reproducible and unrelated files in
// `static/` are left untouched.
//
// Run with: pnpm optimize:images
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asset = p => path.join(root, "assets", p);
const imageOut = p => path.join(root, "static", "img", p);

const faviconBackground = { r: 255, g: 255, b: 255, alpha: 1 };
const brandMark = asset("brand/icon.PNG");
const brandWordmark = asset("brand/icon_full_name.PNG");

await mkdir(path.dirname(imageOut("brand-wordmark.webp")), { recursive: true });

const socialWordmark = await sharp(brandWordmark)
  .trim()
  .resize({ width: 980 })
  .png()
  .toBuffer();

const faviconMark = await sharp(brandMark)
  .trim()
  .resize({ width: 240, height: 240, fit: "inside" })
  .png()
  .toBuffer();

const socialBackground = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="50%" cy="0%" r="90%">
        <stop offset="0%" stop-color="#31318a" stop-opacity="0.72" />
        <stop offset="52%" stop-color="#090116" />
        <stop offset="100%" stop-color="#05010f" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#glow)" />
    <rect width="1200" height="10" fill="#1c70cd" />
    <circle cx="112" cy="92" r="185" fill="#1c70cd" opacity="0.08" />
    <circle cx="1110" cy="560" r="225" fill="#31318a" opacity="0.2" />
    <text x="600" y="438" text-anchor="middle" fill="#cfe4fb" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="500">TypeScript framework for Discord bots</text>
    <text x="600" y="510" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700">arcscord.dev</text>
  </svg>
`);

const targets = [
  {
    label: "brand-wordmark.webp (hero + navbar)",
    run: () =>
      sharp(brandWordmark)
        .trim()
        .resize({ height: 180 })
        .webp({ quality: 92, alphaQuality: 100 })
        .toFile(imageOut("brand-wordmark.webp")),
  },
  {
    label: "favicon.png (256x256, white background)",
    run: () =>
      sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: faviconBackground,
        },
      })
        .composite([{ input: faviconMark, gravity: "center" }])
        .png()
        .toFile(imageOut("favicon.png")),
  },
  {
    label: "social-card.png (1200x630)",
    run: () =>
      sharp(socialBackground)
        .composite([{ input: socialWordmark, left: 110, top: 190 }])
        .png({ compressionLevel: 9 })
        .toFile(imageOut("social-card.png")),
  },
];

for (const target of targets) {
  const info = await target.run();
  const kb = (info.size / 1024).toFixed(1);
  console.log(`✔ ${target.label} — ${info.width}x${info.height}, ${kb} KB`);
}
