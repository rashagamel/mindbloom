// Finds your photos / recordings / character images and wires them into data/content.json.
//   npm run assets            -> writes ASSETS_TODO.md (what is missing, exact file names)
//   npm run assets -- --apply -> also writes the paths of files it finds into the data files
// Naming rules are printed in ASSETS_TODO.md. Nothing here changes app code.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = (p) => new URL(p, root);
const content = JSON.parse(readFileSync(P("data/content.json"), "utf8"));
const config = JSON.parse(readFileSync(P("data/config.json"), "utf8"));
const vocab = JSON.parse(readFileSync(P("data/vocab.json"), "utf8"));
const apply = process.argv.includes("--apply");
const IMG = ["jpg", "jpeg", "png", "webp", "svg", "gif"];
const AUD = ["mp3", "ogg", "wav", "m4a"];
const find = (dir, base, exts) => {
  for (const e of exts) if (existsSync(P(`public/${dir}/${base}.${e}`))) return `/${dir}/${base}.${e}`;
  return null;
};
const pad = (n) => String(n).padStart(2, "0");
const todo = { images: [], audio: [], characters: [] };
let changed = 0;

for (const d of content.domains) {
  (d.words ?? []).forEach((w, i) => {
    const key = d.lang === "ar" ? `ar-${pad(i + 1)}` : w.text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const img = find("images", key, IMG);
    if (img) { if (apply && w.image !== img) { w.image = img; changed++; } }
    else if (!w.image) todo.images.push({ key, note: `${w.emoji} ${w.text}` });
    const aud = find("audio/words", key, AUD);
    if (aud) { if (apply && w.audio !== aud) { w.audio = aud; changed++; } }
    else if (!w.audio) todo.audio.push({ key: `words/${key}`, note: `say "${w.say}"` });
  });
  d.items.forEach((it, i) => {
    if (d.id === "numbers") {
      const out = typeof it.audio === "object" && it.audio ? it.audio : {};
      for (const l of ["en", "ar"]) {
        const key = `numbers-${pad(i + 1)}-${l}`;
        const aud = find("audio", key, AUD);
        if (aud) { if (apply && out[l] !== aud) { out[l] = aud; changed++; } }
        else if (!out[l]) todo.audio.push({ key, note: `say "${it.say[l]}" (${l})` });
      }
      if (apply && Object.keys(out).length) it.audio = out;
    } else {
      const key = `${d.id}-${pad(i + 1)}`;
      const aud = find("audio", key, AUD);
      if (aud) { if (apply && it.audio !== aud) { it.audio = aud; changed++; } }
      else if (!it.audio) todo.audio.push({ key, note: `say "${typeof it.say === "string" ? it.say : JSON.stringify(it.say)}"` });
    }
  });
}

for (const w of vocab.words) {
  const img = find("images", w.id, IMG);
  if (img) { if (apply && w.image !== img) { w.image = img; changed++; } }
  else if (!w.image) todo.images.push({ key: w.id, note: `${w.emoji} ${w.en} / ${w.ar} (Match game)` });
  const out = typeof w.audio === "object" && w.audio ? w.audio : {};
  for (const l of ["en", "ar"]) {
    const key = `vocab-${w.id}-${l}`;
    const aud = find("audio", key, AUD);
    if (aud) { if (apply && out[l] !== aud) { out[l] = aud; changed++; } }
    else if (!out[l]) todo.audio.push({ key, note: `say "${w[l]}" (${l})` });
  }
  if (apply && Object.keys(out).length) w.audio = out;
}

config.mascot ??= { images: {} };
for (const mood of ["happy", "cheer", "think"]) {
  const img = find("characters", mood, IMG);
  if (img) { if (apply && config.mascot.images[mood] !== img) { config.mascot.images[mood] = img; changed++; } }
  else if (!config.mascot.images[mood]) todo.characters.push({ key: mood, note: `mascot, ${mood} mood (GIF/PNG/WebP/SVG, transparent background)` });
}

const rows = (list, dir, exts) =>
  list.length ? list.map((x) => `- [ ] \`public/${dir}/${x.key}.${exts}\` , ${x.note}`).join("\n") : "- all done";
writeFileSync(
  P("ASSETS_TODO.md"),
  `# Assets to add (optional)

The app works without any of these: it uses emoji pictures and the device voice.
Drop a file with the exact name below, then run \`npm run assets -- --apply\` and restart.

Accepted: images ${IMG.join("/")}, audio ${AUD.join("/")}.
Use photos you own or that are licensed for this use (for example Unsplash, Pexels, Pixabay or your own).
Record audio with the phone voice recorder, one short clip per file.

## Word pictures (public/images/)
${rows(todo.images, "images", "jpg")}

## Recordings (public/audio/)
${rows(todo.audio, "audio", "mp3")}

## Mascot images (public/characters/)
${rows(todo.characters, "characters", "gif")}
`
);
if (apply) {
  writeFileSync(P("data/content.json"), JSON.stringify(content, null, 2) + "\n");
  writeFileSync(P("data/config.json"), JSON.stringify(config, null, 2) + "\n");
  writeFileSync(P("data/vocab.json"), JSON.stringify(vocab, null, 2) + "\n");
}
console.log(`missing: ${todo.images.length} images, ${todo.audio.length} audio, ${todo.characters.length} character images`);
if (apply) console.log(`linked ${changed} file(s)`);
