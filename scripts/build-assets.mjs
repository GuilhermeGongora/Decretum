// Builds the served assets from the design sources. Sources are archived under
// docs/design/decretum-v2/source/ and are never served; only the derivatives in public/ are.
//
// Run with `npm run assets:build`. It is idempotent: it always rewrites the derivatives from the
// sources, so a changed source is picked up by running it again.
//
// Two jobs:
//   1. Scene crops, in the convention the other scenes already follow (<scene>-{desktop,mobile}.webp).
//   2. The brand emblem, matted out of the navy plate. The supplied transparent PNG has a defective
//      cut-out (~20 000 pixels of saturated red and yellow fringe left over from keying), so the
//      emblem is derived from the flat-navy plate instead, which mattes cleanly. Same artwork, no
//      redrawing: only the background is removed, and the navy tint is unmultiplied out of the edge
//      pixels so nothing haloes on a dark page.
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "docs/design/decretum-v2/source/branding";
const CHARACTER_SOURCE = "docs/design/decretum-v2/source/characters";
const SCENES = "public/assets/scenes";
const BRAND = "public/assets/brand";
const CHARACTERS = "public/assets/characters";
const APP = "app";

// The dossier frames a portrait 4:5. Sources are generated at that ratio already; the resize is a
// guard, so a source that arrives at another size is cropped instead of distorting the face.
const PORTRAIT = { width: 1122, height: 1402 };

// The navy plate behind the emblem, measured from the corners of logo-bg.png.
const PLATE = { r: 4, g: 19, b: 38 };
// Below `floor` a pixel is background; above `ceil` it is artwork; between them it is an edge and
// gets partial alpha. Measured against the plate, in squared-distance units.
const MATTE = { floor: 34, ceil: 132 };

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const built = [];

async function emit(file, buffer, note) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  built.push({ file, size: buffer.length, note });
}

// Lifts the emblem off its plate. Distance-based matting with unpremultiplication, so an edge pixel
// keeps the brass it had instead of the navy it was blended with.
async function matteEmblem(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) {
    const p = i * info.channels;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const distance = Math.hypot(r - PLATE.r, g - PLATE.g, b - PLATE.b);

    let alpha = (distance - MATTE.floor) / (MATTE.ceil - MATTE.floor);
    alpha = Math.min(1, Math.max(0, alpha));

    const q = i * 4;
    if (alpha === 0) {
      out[q] = out[q + 1] = out[q + 2] = out[q + 3] = 0;
      continue;
    }
    // colour = (observed - plate * (1 - alpha)) / alpha
    out[q] = Math.min(255, Math.max(0, Math.round((r - PLATE.r * (1 - alpha)) / alpha)));
    out[q + 1] = Math.min(255, Math.max(0, Math.round((g - PLATE.g * (1 - alpha)) / alpha)));
    out[q + 2] = Math.min(255, Math.max(0, Math.round((b - PLATE.b * (1 - alpha)) / alpha)));
    out[q + 3] = Math.round(alpha * 255);
  }

  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  // Trim the transparent margin so the emblem fills the box it is given, then square it again.
  const trimmed = await sharp(out, raw).trim({ threshold: 1 }).png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const side = Math.max(width, height);

  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toBuffer();
}

async function buildScene() {
  const source = `${SOURCE}/decision.png`;

  await emit(
    `${SCENES}/decision-desktop.webp`,
    await sharp(source).resize(1600, 900, { fit: "cover" }).webp({ quality: 82 }).toBuffer(),
    "cena do mandato, desktop",
  );

  // The source is 16:9, so a 9:16 crop keeps only the middle third. Framed slightly above centre to
  // hold the Congress towers and the desk; a purpose-made vertical composition is still pending.
  await emit(
    `${SCENES}/decision-mobile.webp`,
    await sharp(source)
      .resize(900, 1599, { fit: "cover", position: sharp.gravity.north })
      .webp({ quality: 80 })
      .toBuffer(),
    "cena do mandato, mobile (recorte central alto)",
  );
}

async function buildBrand() {
  const emblem = await matteEmblem(`${SOURCE}/logo-bg.png`);

  // Served emblem, for the home, the header and the documents.
  for (const size of [512, 256, 128]) {
    await emit(
      `${BRAND}/emblem-${size}.webp`,
      await sharp(emblem).resize(size, size).webp({ quality: 90, alphaQuality: 100 }).toBuffer(),
      `emblema transparente ${size}px`,
    );
  }

  // App icons. Next serves app/icon.png and app/apple-icon.png as the favicon and the touch icon.
  // The emblem is dense at 16px, so the icons keep the navy plate: the silhouette stays readable
  // instead of dissolving into a tab strip.
  const plate = { ...PLATE, alpha: 1 };
  for (const [file, size, pad] of [
    [`${APP}/icon.png`, 48, 4],
    [`${APP}/apple-icon.png`, 180, 18],
  ]) {
    await emit(
      file,
      await sharp({ create: { width: size, height: size, channels: 4, background: plate } })
        .composite([
          {
            input: await sharp(emblem)
              .resize(size - pad * 2, size - pad * 2)
              .toBuffer(),
          },
        ])
        .png()
        .toBuffer(),
      `ícone do aplicativo ${size}px`,
    );
  }

  // Social card: the plate is the point here, so it comes straight from the square source.
  await emit(
    `${BRAND}/social.png`,
    await sharp(`${SOURCE}/logo-bg.png`).resize(1200, 1200).png({ quality: 90 }).toBuffer(),
    "metadata social 1200×1200",
  );
}

// Every portrait in the archive becomes the served WebP the registry points at, by id. A character
// with no source keeps their initials: nothing here invents a face.
async function buildCharacters() {
  const sources = (await readdir(CHARACTER_SOURCE)).filter((file) => file.endsWith(".png")).sort();

  for (const file of sources) {
    const id = path.basename(file, ".png");
    await emit(
      `${CHARACTERS}/${id}.webp`,
      await sharp(`${CHARACTER_SOURCE}/${file}`)
        .resize(PORTRAIT.width, PORTRAIT.height, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer(),
      `retrato ${id}`,
    );
  }
}

await buildScene();
await buildBrand();
await buildCharacters();

let total = 0;
for (const { file, size, note } of built) {
  total += size;
  console.log(`  ${file.padEnd(40)} ${kb(size).padStart(8)}  ${note}`);
}
console.log(`\n${built.length} derivados, ${kb(total)} no total.`);
