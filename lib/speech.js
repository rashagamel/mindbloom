// Speaking, in three layers (the first one that works wins):
//   1. a recorded file   -> `audio` on an item in data/content.json (drop the file in /public/audio)
//   2. the cloud voice   -> /api/tts (app/api/tts/route.js): an ordinary mp3, so it works on EVERY
//                           phone, including phones with no Arabic voice installed
//   3. the device voice  -> the browser's own speechSynthesis (offline backup, or if the API is down)
// If all three fail the app shows the "no voice" notice instead of staying silent.
//
// Mobile browsers only allow sound after a touch. One shared <audio> element is "unlocked" by the
// first touch anywhere in the app and then reused, so sounds that start a moment later still play.

let player = null;
let unlocked = false;
let seq = 0;            // every new speak() cancels the older one
let cache = [];         // device voices
let loading = null;
let cloudBadUntil = 0;  // after a failed download, skip the cloud for 30 s (offline / API down)
const clips = new Map(); // cloud url -> Promise<object url>
const warned = new Set();

const norm = (l) => String(l ?? "").toLowerCase().replace("_", "-");
const base = (l) => (norm(l).slice(0, 2) === "ar" ? "ar" : "en");
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

// ---------- shared audio element + mobile unlock ----------
function getPlayer() {
  if (!player && typeof Audio !== "undefined") {
    player = new Audio();
    player.preload = "auto";
    player.setAttribute("playsinline", "");
  }
  return player;
}

function installUnlock() {
  if (typeof window === "undefined" || window.__mbUnlock) return;
  window.__mbUnlock = true;
  const go = () => {
    const p = getPlayer();
    if (p && !unlocked) {
      p.src = SILENCE;
      p.play().then(() => { unlocked = true; p.pause(); }).catch(() => {});
    }
    try { window.speechSynthesis?.resume(); } catch {}
  };
  ["pointerdown", "touchend", "click", "keydown"].forEach((ev) => window.addEventListener(ev, go, { passive: true, capture: true }));
}
installUnlock();

// ---------- device voices (layer 3) ----------
export function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);
  const s = window.speechSynthesis;
  const now = s.getVoices();
  if (now.length) { cache = now; return Promise.resolve(now); }
  if (!loading) {
    loading = new Promise((resolve) => {
      const done = () => { s.removeEventListener("voiceschanged", done); cache = s.getVoices(); resolve(cache); };
      s.addEventListener("voiceschanged", done);
      setTimeout(done, 1500);
    });
  }
  return loading;
}

// Best device voice for a language: same region first, then the same language; natural-sounding names first.
export function pickVoice(voices, lang) {
  const want = norm(lang), b = want.slice(0, 2);
  const same = voices.filter((v) => norm(v.lang) === want);
  const loose = voices.filter((v) => norm(v.lang).startsWith(b));
  const pool = same.length ? same : loose;
  const score = (v) => (/google|natural|online|microsoft/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  return [...pool].sort((a, b2) => score(b2) - score(a))[0] ?? null;
}

export const hasVoice = (lang) => !!pickVoice(cache, lang);

function deviceSpeak(text, lang, rate, id) {
  return new Promise((resolve) => {
    const s = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!s) return resolve(false);
    loadVoices().then((voices) => {
      const voice = pickVoice(voices, lang);
      if (!voice) return resolve(false);
      if (id !== seq) return resolve(true);
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice.lang; u.voice = voice; u.rate = rate;
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(true); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 6000); // some phones never fire onend
      s.speak(u);
    });
  });
}

// ---------- cloud voice (layer 2) ----------
export const ttsUrl = (text, lang, slow = false, kind = "") =>
  `/api/tts?lang=${base(lang)}&text=${encodeURIComponent(text)}${slow ? "&slow=1" : ""}${kind ? `&kind=${kind}` : ""}`;

function fetchClip(text, lang, slow, kind) {
  const url = ttsUrl(text, lang, slow, kind);
  if (!clips.has(url)) {
    const job = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`tts ${r.status}`); return r.blob(); })
      .then((b) => { if (b.size < 200) throw new Error("tts empty"); return URL.createObjectURL(b); });
    job.catch(() => clips.delete(url)); // a failure must not be remembered
    clips.set(url, job);
  }
  return clips.get(url);
}

// Download voices for a screen ahead of time so taps feel instant.
// items: strings, or { text, kind, slow }
export function preload(items, lang) {
  if (typeof window === "undefined" || Date.now() < cloudBadUntil) return;
  const seen = new Set();
  items.filter(Boolean).forEach((it) => {
    const o = typeof it === "string" ? { text: it } : it;
    const key = `${o.text}|${o.kind ?? ""}|${o.slow ? 1 : 0}`;
    if (!o.text || seen.has(key)) return;
    seen.add(key);
    fetchClip(o.text, lang, !!o.slow, o.kind ?? "").catch(() => {});
  });
}

function playUrl(url, id) {
  return new Promise((resolve, reject) => {
    const p = getPlayer();
    if (!p) return reject(new Error("no audio"));
    let watch = null;
    const finish = (fn, v) => { clearInterval(watch); p.onended = p.onerror = null; fn(v); };
    p.onended = () => finish(resolve, true);
    p.onerror = () => finish(reject, new Error("audio error"));
    watch = setInterval(() => { if (id !== seq) finish(resolve, false); }, 150); // replaced by a newer speak()
    p.src = url;
    const started = p.play();
    if (started?.catch) started.catch((e) => finish(reject, e));
  });
}

function warn(lang) {
  const b = base(lang);
  if (warned.has(b)) return;
  warned.add(b);
  window.dispatchEvent(new CustomEvent("mb-novoice", { detail: { lang: b } }));
}

// ---------- public API ----------
// speak(text, lang, audioUrl?, { rate, kind }) -> Promise<boolean>  (true = something was played)
// kind: "name" | "sound" for English letters (exact pronunciation on the cloud voice)
export async function speak(text, lang, audioUrl, { rate = 0.8, kind = "" } = {}) {
  if (typeof window === "undefined") return false;
  const id = ++seq;
  const p = getPlayer();
  if (p) p.pause();
  window.speechSynthesis?.cancel();

  try {
    if (audioUrl) return await playUrl(audioUrl, id);
  } catch { /* file missing: fall through to the voices */ }
  if (!text) return false;

  const slow = rate <= 0.65;
  if (Date.now() >= cloudBadUntil) {
    try {
      const url = await fetchClip(text, lang, slow, kind);
      if (id !== seq) return false;
      const played = await playUrl(url, id);
      cloudBadUntil = 0;
      return played;
    } catch {
      if (id !== seq) return false;
      cloudBadUntil = Date.now() + 30000; // offline or API down: use the phone's voice for a while
    }
  }
  const ok = await deviceSpeak(text, lang, rate, id);
  if (!ok && id === seq) warn(lang);
  return ok;
}

// A letter's name, then its sound ("bee ... buh").
export async function speakBoth(name, sound, lang, { audioName, audioSound, kinds = false } = {}) {
  const first = await speak(name, lang, audioName, kinds ? { kind: "name" } : {});
  if (sound && first) await speak(sound, lang, audioSound, { rate: 0.6, kind: kinds ? "sound" : "" });
}

// For the grown-ups' Sound check: can the cloud voice and the phone's own voice speak this language?
export async function probeVoices(lang) {
  const sample = base(lang) === "ar" ? "أَلِف" : "hello";
  let cloud = false;
  try { await fetchClip(sample, lang, false, ""); cloud = true; cloudBadUntil = 0; } catch {}
  const voices = await loadVoices();
  const v = pickVoice(voices, lang);
  return { cloud, device: v ? v.name : null };
}
