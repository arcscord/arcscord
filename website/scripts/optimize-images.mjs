import path from "node:path";
// Generates web-optimized image derivatives from source masters in `assets/`.
// Declarative on purpose: each target is listed explicitly so unrelated assets
// in `static/img` (e.g. social-card.png, kept as PNG for og:image) are untouched.
//
// Run with: pnpm optimize:images
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asset = p => path.join(root, "assets", p);
const out = p => path.join(root, "static", "img", p);

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const targets = [
  {
    label: "logo.webp (hero + navbar)",
    run: () =>
      sharp(asset("Arcscord_Logo.png"))
        .trim() // drop transparent margins around the mascot
        .resize({ height: 320 }) // ~2x of the 140px hero display
        .webp({ quality: 85 })
        .toFile(out("logo.webp")),
  },
  {
    label: "favicon.png (256x256)",
    run: () =>
      sharp(asset("Arcscord_Logo.png"))
        .trim()
        .resize(256, 256, { fit: "contain", background: transparent })
        .png()
        .toFile(out("favicon.png")),
  },
];

for (const target of targets) {
  const info = await target.run();
  const kb = (info.size / 1024).toFixed(1);
  console.log(`✔ ${target.label} — ${info.width}x${info.height}, ${kb} KB`);
}
