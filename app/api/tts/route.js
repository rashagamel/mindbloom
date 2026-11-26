// Text-to-speech API:  GET /api/tts?text=<text>&lang=ar|en[&slow=1][&kind=name|sound]  ->  audio/mpeg
//
// Why this exists: many phones have no Arabic voice installed, so the browser cannot read Arabic
// aloud. This route makes the voice on the server, so every phone just plays an ordinary mp3.
// Answers are cached for a year (browser + Vercel CDN), so each word is generated only once.
//
// Providers, tried in this order (set them in Vercel > Settings > Environment Variables, then redeploy):
//   1. Azure Neural TTS   AZURE_SPEECH_KEY + AZURE_SPEECH_REGION   (best quality; free tier = 500k chars/month)
//        optional: AZURE_VOICE_AR (default ar-EG-SalmaNeural), AZURE_VOICE_EN (default en-US-AnaNeural)
//        Azure also gets exact pronunciation for English letter names and letter sounds (see below).
//   2. Google Translate TTS  (no key needed; unofficial – Vercel egress IPs can be blocked occasionally)
//   3. VoiceRSS       VOICERSS_KEY  (free tier 350 req/day — good emergency fallback; sign up at voicerss.org)
// If every provider fails the route answers 502 and the app falls back to the phone's own voice.
//
// ── KNOWN DEPLOYMENT ISSUE ──────────────────────────────────────────────────────────────────────
// Google Translate TTS sometimes blocks Vercel's shared egress IPs (returns 429 or empty audio).
// Fix A (recommended): add AZURE_SPEECH_KEY + AZURE_SPEECH_REGION in Vercel > Settings > Env Vars
//        and redeploy. Azure free tier = 500 000 chars/month – more than enough for a school app.
// Fix B (free backup):  add VOICERSS_KEY (free at voicerss.org, 350 req/day) so there is a third
//        reliable fallback when Google is rate-limited.
// ────────────────────────────────────────────────────────────────────────────────────────────────
//
// Request rules (anything else is a 400, so the route cannot be abused as a general proxy):
//   lang must be "ar" or "en";  text is 1-140 characters;  Arabic text must contain Arabic letters,
//   English text must not.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANGS = { ar: "ar-SA", en: "en-US" };
const MAX_CHARS = 140;
const AR = /[\u0600-\u06FF]/;

// English letter NAMES in the data are spelled the way they sound ("bee", "double you").
// Azure reads the real letter correctly with say-as, so map them back.
const LETTER_NAME = {
  ay: "A", bee: "B", see: "C", dee: "D", ee: "E", eff: "F", jee: "G", aitch: "H", eye: "I", jay: "J",
  kay: "K", el: "L", em: "M", en: "N", oh: "O", pee: "P", cue: "Q", ar: "R", ess: "S", tee: "T",
  you: "U", vee: "V", "double you": "W", ex: "X", why: "Y", zed: "Z",
};
// English letter SOUNDS as exact phonemes (IPA), so "buh" is a clean /bə/ and not a word.
const LETTER_SOUND = {
  ah: "æ", buh: "bə", kuh: "kə", duh: "də", eh: "ɛ", fuh: "fə", guh: "ɡə", huh: "hə", ih: "ɪ", juh: "dʒə",
  luh: "lə", muh: "mə", nuh: "nə", aw: "ɒ", puh: "pə", kwuh: "kwə", ruh: "rə", suh: "sə", tuh: "tə",
  uh: "ʌ", vuh: "və", wuh: "wə", ks: "ks", yuh: "jə", zuh: "zə",
};

const audio = (buf, provider) =>
  new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "X-TTS-Provider": provider,
    },
  });
const fail = (status, error) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inner(text, lang, kind) {
  const key = text.toLowerCase();
  if (lang === "en" && kind === "name" && LETTER_NAME[key])
    return `<say-as interpret-as="characters">${LETTER_NAME[key]}</say-as>`;
  if (lang === "en" && kind === "sound" && LETTER_SOUND[key])
    return `<phoneme alphabet="ipa" ph="${LETTER_SOUND[key]}">${esc(text)}</phoneme>`;
  return esc(text);
}

// ── Provider 1: Azure Neural TTS ──────────────────────────────────────────────────────────────
async function azure(text, lang, slow, kind) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  const voice = lang === "ar"
    ? process.env.AZURE_VOICE_AR || "ar-EG-SalmaNeural"
    : process.env.AZURE_VOICE_EN || "en-US-AnaNeural";
  const locale = voice.split("-").slice(0, 2).join("-");
  const ssml =
    `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}">` +
    `<prosody rate="${slow ? "-30%" : "-12%"}">${inner(text, lang, kind)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "mindbloom",
    },
    body: ssml,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`azure ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Provider 2: Google Translate TTS ─────────────────────────────────────────────────────────
// IMPORTANT: Google's unofficial TTS endpoint often blocks Vercel's shared egress IPs.
// We rotate User-Agent strings and pass the correct Accept header to look like a real browser.
// If this still fails (429 / empty buffer) you MUST add an Azure or VoiceRSS key (see above).
const UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

async function google(text, lang, slow) {
  const ua = UAS[Math.floor(Math.random() * UAS.length)];
  // Map "ar" -> "ar" and "en" -> "en" (Google TTS uses short codes)
  const tl = lang === "ar" ? "ar" : "en";
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob" +
    `&tl=${tl}&ttsspeed=${slow ? "0.24" : "0.5"}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      "Referer": "https://translate.google.com/",
      "Accept": "audio/mpeg,audio/*;q=0.8,*/*;q=0.5",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("google: empty audio");
  return buf;
}

// ── Provider 3: VoiceRSS ──────────────────────────────────────────────────────────────────────
// Free tier: 350 requests/day. Sign up at https://www.voicerss.org/
// Set VOICERSS_KEY in Vercel > Settings > Environment Variables.
// Voice codes: Arabic = "ar-eg"  English = "en-us"
const VOICERSS_VOICES = { ar: "ar-eg", en: "en-us" };
async function voicerss(text, lang, slow) {
  const key = process.env.VOICERSS_KEY;
  if (!key) return null;
  const hl = VOICERSS_VOICES[lang] ?? "en-us";
  const r = slow ? "-4" : "0"; // rate: -10 (slowest) to 10 (fastest); 0 = normal
  const url =
    `https://api.voicerss.org/?key=${key}&hl=${hl}&r=${r}&c=MP3&f=24khz_16bit_mono` +
    `&src=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`voicerss ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // VoiceRSS returns plain text errors like "ERROR: ..." as small payloads
  if (buf.length < 200) throw new Error(`voicerss: empty audio (${buf.toString("utf8", 0, 100)})`);
  return buf;
}

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const lang = p.get("lang");
  const text = (p.get("text") ?? "").normalize("NFC").trim();
  const slow = p.get("slow") === "1";
  const kind = p.get("kind") === "name" || p.get("kind") === "sound" ? p.get("kind") : "";

  if (!LANGS[lang]) return fail(400, "lang must be ar or en");
  if (!text) return fail(400, "text is empty");
  if (Array.from(text).length > MAX_CHARS) return fail(400, "text is too long");
  if (lang === "ar" && !AR.test(text)) return fail(400, "text is not Arabic");
  if (lang === "en" && AR.test(text)) return fail(400, "text is not English");

  for (const [name, fn] of [["azure", azure], ["google", google], ["voicerss", voicerss]]) {
    try {
      const buf = await fn(text, lang, slow, kind);
      if (buf) return audio(buf, name);
    } catch (e) {
      console.error("tts", name, e?.message);
    }
  }
  return fail(502, "no voice provider answered");
}
