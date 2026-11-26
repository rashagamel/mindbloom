// Draws the app icons (public/icons/*.png) from the mascot. Needs Playwright:  node tools/make-icons.mjs
// You only need to run this again if you change the mascot design.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d6"/><stop offset="1" stop-color="#ffd9a8"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <g transform="translate(15 17) scale(.70)">
    <path d="M50 28 C50 14 40 8 28 10 C28 22 36 30 50 28Z" fill="#3bb273"/>
    <path d="M50 28 C50 12 62 6 74 10 C74 24 64 30 50 28Z" fill="#5fd391"/>
    <ellipse cx="50" cy="62" rx="32" ry="30" fill="#ffb347"/>
    <ellipse cx="50" cy="62" rx="32" ry="30" fill="none" stroke="#e8902a" stroke-width="3"/>
    <circle cx="38" cy="54" r="5" fill="#2b2a33"/><circle cx="62" cy="54" r="5" fill="#2b2a33"/>
    <circle cx="40" cy="52" r="1.6" fill="#fff"/><circle cx="64" cy="52" r="1.6" fill="#fff"/>
    <circle cx="30" cy="66" r="5" fill="#ff8e72" opacity=".6"/><circle cx="70" cy="66" r="5" fill="#ff8e72" opacity=".6"/>
    <path d="M38 64 q12 16 24 0 z" fill="#b3261e" stroke="#2b2a33" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
const browser = await chromium.launch();
for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["maskable-512", 512], ["apple-touch-icon", 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`);
  await page.screenshot({ path: new URL(`../public/icons/${name}.png`, import.meta.url).pathname });
  await page.close();
}
await browser.close();
console.log("icons written");
