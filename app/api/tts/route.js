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
//   2. Google Translate   no key needed (unofficial endpoint: fine for a prototype, can change without notice)
// If every provider fails the route answers 502 and the app falls back to the phone's own voice.
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

async function azure(text, lang, slow, kind) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  const voice = lang === "ar" ? process.env.AZURE_VOICE_AR || "ar-EG-SalmaNeural" : process.env.AZURE_VOICE_EN || "en-US-AnaNeural";
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

async function google(text, lang, slow) {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob" +
    `&tl=${lang}&ttsspeed=${slow ? "0.24" : "0.5"}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("google: empty audio");
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

  for (const [name, fn] of [["azure", azure], ["google", google]]) {
    try {
      const buf = await fn(text, lang, slow, kind);
      if (buf) return audio(buf, name);
    } catch (e) {
      console.error("tts", name, e?.message);
    }
  }
  return fail(502, "no voice provider answered");
}
