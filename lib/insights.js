// Explainable progress for parents and teachers. Pure functions, no DOM.
// Everything is a learning observation, never a diagnosis.
import { masteryOf, summarize } from "./engine.js";

// How the child met the question: seeing it, hearing it, or doing it with their hands.
const DO = new Set(["trace", "parts", "dots", "bake", "hop", "build"]);
export const formatOf = (ty) => (ty === "sound" ? "hear" : DO.has(ty) ? "do" : "see");
export const FORMATS = ["see", "hear", "do"];

// Games that log a fixed time are left out of timing.
const TIMED = new Set(["sound", "count", "missing", "example", "trace", "parts", "dots", "bake", "hop", "build"]);

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function formatStats(state) {
  const out = Object.fromEntries(FORMATS.map((f) => [f, { n: 0, ok: 0, acc: null }]));
  for (const e of state.log ?? []) {
    if (!e.ty || e.rec === 1) continue; // recovery steps are easier on purpose
    const s = out[formatOf(e.ty)];
    s.n++;
    if (e.ok) s.ok++;
  }
  for (const f of FORMATS) out[f].acc = out[f].n ? out[f].ok / out[f].n : null;
  return out;
}

// Which way of learning works best, only when there is enough evidence and a clear gap.
export function bestFormat(stats, { minN = 6, margin = 0.15 } = {}) {
  const ok = FORMATS.filter((f) => stats[f].n >= minN);
  if (ok.length < 2) return null;
  const ranked = [...ok].sort((a, b) => stats[b].acc - stats[a].acc);
  const best = ranked[0], worst = ranked.at(-1);
  return stats[best].acc - stats[worst].acc >= margin ? { best, worst, bestAcc: stats[best].acc, worstAcc: stats[worst].acc } : null;
}

// First half of recent answers against the second half.
export function trend(state, { min = 20 } = {}) {
  const log = (state.log ?? []).filter((e) => e.rec !== 1);
  if (log.length < min) return null;
  const h = log.length >> 1;
  const acc = (a) => a.filter((e) => e.ok).length / a.length;
  const delta = acc(log.slice(h)) - acc(log.slice(0, h));
  return { delta, dir: delta >= 0.1 ? "up" : delta <= -0.1 ? "down" : "flat" };
}

// Skill profile: one bar per area that has enough answers. value 0..1
export function skillProfile(state, content, config, minN = 3) {
  const bars = [];
  for (const d of content.domains) {
    const open = d.items.filter((it) => state.items[`${d.id}:${it.id}`]?.attempts > 0);
    const n = open.reduce((s, it) => s + state.items[`${d.id}:${it.id}`].attempts, 0);
    if (n >= minN) bars.push({ id: d.id, kind: "domain", value: open.reduce((s, it) => s + masteryOf(state, d.id, it.id, config), 0) / open.length, n });
  }
  for (const [id, ty] of [["writing", "trace"], ["memory", "memory"]]) {
    const es = (state.log ?? []).filter((e) => e.ty === ty);
    if (es.length >= minN) bars.push({ id, kind: "skill", value: es.filter((e) => e.ok).length / es.length, n: es.length });
  }
  return bars;
}

// Plain-language observations. Each is { kind, ...vars }; the UI turns them into text.
export function explain(state, content, config, levelsData = { worlds: [] }, { minAnswers = 10 } = {}) {
  const out = [];
  const log = state.log ?? [];
  if (log.length < minAnswers) return [{ kind: "few", n: minAnswers }];

  const rows = summarize(state, content, config, levelsData);
  for (const r of rows) {
    for (const c of r.confusions.slice(0, 2)) out.push({ kind: "confusion", domainId: r.domain.id, a: c.target, b: c.chosen, weight: c.weight });
  }

  // slower than usual in one area (only games with a real timer)
  const timed = log.filter((e) => TIMED.has(e.ty) && e.ms > 0 && e.ms < 60000 && e.rec !== 1);
  const all = median(timed.map((e) => e.ms));
  for (const d of content.domains) {
    const mine = timed.filter((e) => e.d === d.id);
    if (mine.length >= 8 && all && median(mine.map((e) => e.ms)) > all * 1.6) out.push({ kind: "slow", domainId: d.id });
  }

  const bf = bestFormat(formatStats(state));
  if (bf) out.push({ kind: "format", ...bf });

  const recs = log.filter((e) => e.rec === 1).length;
  if (recs >= 2) {
    const rechecks = log.filter((e) => e.rec === 2);
    out.push({ kind: "recovery", n: recs, back: rechecks.filter((e) => e.ok).length, rechecks: rechecks.length });
  }

  const tr = trend(state);
  if (tr) out.push({ kind: "trend", dir: tr.dir, pts: Math.round(Math.abs(tr.delta) * 100) });

  for (const r of rows) if (r.strong >= 2) out.push({ kind: "strong", domainId: r.domain.id, n: r.strong });
  return out;
}
