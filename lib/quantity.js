// Quick Look Owl engine: number sense without counting. Pure functions, no browser APIs.
//   look : dots flash for a moment, the child says how many ("subitizing")
//   line : place a number on an unmarked number line
//   more : which of two groups has more ("approximate number sense")
// All numbers come from data/config.json ("owl"). Weak spots come back more often.

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- progress -------------------------------------------------------------
const statOf = (state, game, key) => state.number?.[game]?.[key] ?? { right: 0, wrong: 0 };
const weightOf = (state, game, key) => {
  const s = statOf(state, game, key);
  return Math.max(0.3, 1 + 2 * s.wrong - 0.5 * s.right);
};
const totalRight = (state, game) => Object.values(state.number?.[game] ?? {}).reduce((s, v) => s + v.right, 0);

// Every few first-try successes the game steps up a level.
export const levelOf = (state, game, perLevel) => Math.floor(totalRight(state, game) / perLevel);
export const lookMax = (state, cfg) => Math.min(cfg.maxLook, 3 + 2 * levelOf(state, "look", cfg.rightsPerLevel));
export const lineMax = (state, cfg) => (levelOf(state, "line", cfg.rightsPerLevel) < 1 ? 5 : 10);
export const flashFor = (state, cfg) => cfg.flashMs[Math.min(cfg.flashMs.length - 1, levelOf(state, "look", cfg.rightsPerLevel))];

function pickWeighted(list, weight, rng) {
  const total = list.reduce((s, x) => s + weight(x), 0);
  let r = rng() * total;
  for (const x of list) { r -= weight(x); if (r <= 0) return x; }
  return list[list.length - 1];
}
const fresh = (list, key, recent) => {
  const f = list.filter((x) => !recent.includes(key(x)));
  return f.length ? f : list;
};

// Eastern Arabic digits when the app is in Arabic.
export const numLabel = (n, lang) => (lang === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]) : String(n));

// ---- layouts: points on a 0..100 square ----------------------------------
const DICE = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};
export const diceLayout = (n) => DICE[n].map((p) => [...p]);

// Ten-frame: two rows of five. Fill the top row first, so 7 reads as "5 and 2 more".
export const tenFrameLayout = (n) => Array.from({ length: n }, (_, i) => [10 + 20 * (i % 5), i < 5 ? 30 : 70]);

// Rows of five, used to line two groups up for comparing.
export const rowsLayout = (n) => Array.from({ length: n }, (_, i) => [12 + 19 * (i % 5), 14 + 24 * Math.floor(i / 5)]);

export const minDistFor = (n) => (n <= 6 ? 26 : 18);

// Random spread with a minimum distance so dots never overlap; falls back to a jittered grid.
export function scatterLayout(n, rng = Math.random, minDist = minDistFor(n)) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries < 400) {
      tries++;
      const p = [12 + rng() * 76, 12 + rng() * 76];
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= minDist)) pts.push(p);
    }
    if (pts.length === n) return pts;
  }
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => [
    12 + ((i % cols) + 0.5) * (76 / cols) + (rng() - 0.5) * 4,
    12 + (Math.floor(i / cols) + 0.5) * (76 / rows) + (rng() - 0.5) * 4,
  ]);
}

// Pick a layout for n dots: dice or ten-frame (patterns the eye reads fast) or a random spread (harder).
export function layoutFor(n, rng = Math.random) {
  const pattern = rng() < 0.65;
  if (pattern && n <= 6) return { kind: "dice", pts: diceLayout(n) };
  if (pattern) return { kind: "frame", pts: tenFrameLayout(n) };
  return { kind: "scatter", pts: scatterLayout(n, rng) };
}

// ---- rounds ----------------------------------------------------------------
export function buildLookRound(state, cfg, { rng = Math.random, recent = [] } = {}) {
  const max = lookMax(state, cfg);
  const ns = Array.from({ length: max }, (_, i) => i + 1);
  const n = pickWeighted(fresh(ns, String, recent), (x) => weightOf(state, "look", String(x)), rng);
  // neighbours make the best distractors: 4 is easy to confuse with 3 or 5
  const near = shuffle([n - 2, n - 1, n + 1, n + 2].filter((x) => x >= 1 && x <= Math.max(max, n + 1) && x <= 10), rng);
  const choices = shuffle([n, ...near.slice(0, 2)], rng);
  const layout = layoutFor(n, rng);
  return { game: "look", key: String(n), n, layout, choices, flashMs: flashFor(state, cfg) };
}

export function buildLineRound(state, cfg, { rng = Math.random, recent = [] } = {}) {
  const max = lineMax(state, cfg);
  const ns = Array.from({ length: max - 1 }, (_, i) => i + 1); // endpoints are already labelled
  const n = pickWeighted(fresh(ns, (x) => `${x}/${max}`, recent), (x) => weightOf(state, "line", `${x}/${max}`), rng);
  return { game: "line", key: `${n}/${max}`, n, max };
}

// Where did the child tap? x is 0..1 along the line. "ok" is on target, "close" is near, otherwise off.
export function scoreLine(round, x, cfg) {
  const err = x - round.n / round.max;
  const a = Math.abs(err);
  return { ok: a <= cfg.lineTolerance, close: a <= cfg.lineClose, dir: err < 0 ? "bigger" : "smaller", err };
}

export function buildMoreRound(state, cfg, { rng = Math.random, recent = [], emoji = ["🍎"] } = {}) {
  const level = Math.min(cfg.moreRatios.length - 1, levelOf(state, "more", cfg.moreRightsPerLevel));
  const ratio = cfg.moreRatios[level];
  const key = `lvl${level}`;
  const maxSmall = Math.max(2, Math.floor(cfg.moreMaxCount / ratio));
  const small = 2 + Math.floor(rng() * (maxSmall - 1));
  const big = Math.min(cfg.moreMaxCount, Math.max(small + 1, Math.round(small * ratio)));
  const bigSide = rng() < 0.5 ? 0 : 1;
  const em = shuffle(emoji.filter((e) => !recent.includes(e)).length ? emoji.filter((e) => !recent.includes(e)) : emoji, rng)[0];
  const counts = bigSide === 0 ? [big, small] : [small, big];
  const groups = counts.map((count) => ({ count, pts: scatterLayout(count, rng, count > 6 ? 22 : 26), rows: rowsLayout(count) }));
  return { game: "more", key, level, emoji: em, groups, answer: bigSide };
}

export const BUILDERS = { look: buildLookRound, line: buildLineRound, more: buildMoreRound };

// ---- logging ----------------------------------------------------------------
export function recordNumber(state, game, key, firstTry, cfg) {
  const prev = statOf(state, game, key);
  const next = { right: prev.right + (firstTry ? 1 : 0), wrong: prev.wrong + (firstTry ? 0 : 1) };
  const stars = state.stars + (firstTry ? cfg.starsFirstTry : cfg.starsRetry);
  return { ...state, stars, number: { ...state.number, [game]: { ...state.number?.[game], [key]: next } } };
}

export function numberSummary(state, games) {
  return games.map((id) => {
    const rows = Object.entries(state.number?.[id] ?? {});
    const right = rows.reduce((s, [, v]) => s + v.right, 0);
    const wrong = rows.reduce((s, [, v]) => s + v.wrong, 0);
    const hard = rows.filter(([, v]) => v.wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 3).map(([k]) => k);
    return { id, right, wrong, total: right + wrong, hard };
  });
}
