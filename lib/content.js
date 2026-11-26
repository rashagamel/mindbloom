import content from "@/data/content.json";
import config from "@/data/config.json";
import strings from "@/data/strings.json";
import library from "@/data/library.json";
import levels from "@/data/levels.json";
import twins from "@/data/twins.json";
import about from "@/data/about.json";
import rewards from "@/data/rewards.json";
import vocab from "@/data/vocab.json";
import sounds from "@/data/sounds.json";
import wellbeing from "@/data/wellbeing.json";
import owl from "@/data/owl.json";
import { resolveText } from "./engine.js";

export { content, config, strings, library, levels, twins, about, rewards, vocab, sounds, wellbeing, owl };

export const worldOf = (domainId) => levels.worlds.find((w) => w.domain === domainId);
// The twin clue for a letter: a picture plus one sentence about what makes it different.
export const hintOf = (domainId, itemId, lang) => {
  const h = twins[domainId]?.[itemId];
  return h ? { emoji: h.emoji, text: resolveText(h.text, lang) } : null;
};
// A picture for an item: a word that starts with the letter, or that many objects for a number.
export const pictureOf = (domain, item) => {
  if (domain.countEmoji) return { emoji: Array(item.n).fill(domain.countEmoji[0]).join("") };
  const w = wordOf(domain, item);
  return w ? { emoji: w.emoji, image: w.image, text: w.text, say: w.say ?? w.text, audio: w.audio } : null;
};
// The example word for a letter (أ إ آ all count as ا).
export const wordOf = (domain, item) => {
  const norm = (c) => ("أإآ".includes(c) ? "ا" : c);
  return (domain.words ?? []).find((x) => norm(Array.from(x.text)[0]) === item.id) ?? null;
};

export const findDomain = (id) => content.domains.find((d) => d.id === id);
export const findItem = (domain, id) => domain.items.find((i) => i.id === id);
export const itemLabel = (domain, id, lang) => resolveText(findItem(domain, id)?.label, lang) ?? id;

// Which language a domain is read in: its own, or the app language ("ui").
export const domainLang = (domain, uiLang) => (domain.lang === "ui" ? uiLang : domain.lang);
export const domainSpeechLang = (domain, uiLang) =>
  domain.speechLang ?? strings[uiLang]?.speechLang ?? "en-US";
export const domainDir = (domain, uiLang) => (domain.dir === "ui" ? strings[uiLang].dir : domain.dir);
