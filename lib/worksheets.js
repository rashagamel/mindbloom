// Printable worksheets built from the same JSON the app uses. Pure functions: no DOM.
// Items the child finds hard (lowest mastery) come first; with no history the order is natural.
import { masteryOf, resolveText } from "./engine.js";

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const SHEET_SIZE = { trace: 8, circle: 6, match: 5, count: 6 };

// Which activities make sense for a topic.
export function activitiesFor(topic, content) {
  if (topic === "vocab") return ["match"];
  const d = content.domains.find((x) => x.id === topic);
  if (!d) return [];
  const out = [];
  if (d.kind !== "shape") out.push("trace");
  if ((d.groups ?? []).length) out.push("circle");
  if (d.kind === "shape" || d.words?.length) out.push("match");
  if (d.countEmoji) out.push("count");
  return out;
}

const hardestFirst = (domain, state, config) =>
  domain.items
    .map((it, i) => ({ id: it.id, i, p: state ? masteryOf(state, domain.id, it.id, config) : 0.5 }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((x) => x.id);

export function buildWorksheet({ topic, activity, content, vocab, state, config, lang, pictureOf, rng = Math.random }) {
  if (topic === "vocab") {
    const words = shuffle(vocab.words, rng).slice(0, SHEET_SIZE.match);
    const pairs = words.map((w, i) => ({ key: i, left: { emoji: w.emoji }, right: { text: w[lang] ?? w.en } }));
    return { topic, activity: "match", pairs, order: shuffle(pairs.map((_, i) => i), rng) };
  }
  const d = content.domains.find((x) => x.id === topic);
  const hard = hardestFirst(d, state, config);

  if (activity === "trace") return { topic, activity, rows: hard.slice(0, SHEET_SIZE.trace).map((id) => ({ id })) };

  if (activity === "count") {
    const ids = hard.slice(0, SHEET_SIZE.count);
    return {
      topic, activity,
      rows: ids.map((id, i) => {
        const it = d.items.find((x) => x.id === id);
        return { id, n: it.n, emoji: d.countEmoji[i % d.countEmoji.length] };
      }),
    };
  }

  if (activity === "circle") {
    // Targets that have look-alikes come first, then the hardest ones.
    const twins = (id) => (d.groups ?? []).filter((g) => g.includes(id)).flat().filter((x) => x !== id);
    const withTwins = hard.filter((id) => twins(id).length);
    const rows = withTwins.slice(0, SHEET_SIZE.circle).map((id) => {
      const decoys = [...new Set(twins(id))];
      const others = d.items.map((x) => x.id).filter((x) => x !== id && !decoys.includes(x));
      const fillers = shuffle(others, rng).slice(0, 2);
      const correct = 3 + Math.floor(rng() * 2); // 3 or 4 matches
      const options = [
        ...Array(correct).fill(id),
        ...Array.from({ length: 6 - correct }, (_, k) => [...decoys, ...fillers][k % (decoys.length + fillers.length)]),
      ];
      return { target: id, options: shuffle(options, rng) };
    });
    return { topic, activity, rows };
  }

  // match: letter -> picture, or shape -> real object
  const pairs = [];
  for (const id of hard) {
    const it = d.items.find((x) => x.id === id);
    let right = null;
    if (d.kind === "shape") {
      const ex = (d.examples?.[id] ?? [])[0];
      if (ex) right = { emoji: ex.emoji, text: resolveText(ex.text, lang) };
      if (right) pairs.push({ key: pairs.length, left: { shape: id }, right });
    } else {
      const pic = pictureOf(d, it);
      if (pic?.emoji) pairs.push({ key: pairs.length, left: { id }, right: { emoji: pic.emoji } });
    }
    if (pairs.length >= SHEET_SIZE.match) break;
  }
  return { topic, activity, pairs, order: shuffle(pairs.map((_, i) => i), rng) };
}
