// "My Superpower": a strengths-first picture of how a child learns, built from what the app already knows.
// Everything here is a game-play observation. It never labels a weakness and is not a diagnosis.
import { masteryOf } from "./engine.js";
import { FORMATS, bestFormat, formatStats } from "./insights.js";

// Which way of learning works best: "see" | "hear" | "do" | "all" | null (still exploring).
export function superPower(state) {
  const stats = formatStats(state);
  const bf = bestFormat(stats);
  if (bf && bf.bestAcc >= 0.55) return { power: bf.best, stats };
  const enough = FORMATS.filter((f) => stats[f].n >= 6);
  if (!bf && enough.length >= 2 && enough.every((f) => stats[f].acc >= 0.6)) return { power: "all", stats };
  return { power: null, stats };
}

// Times the child tried again and got it: successful re-checks, plus every Safari/Owl round that took a second go.
export function braveTries(state) {
  const log = (state.log ?? []).filter((e) => e.rec === 2 && e.ok).length;
  const extra = (g) => Object.values(g ?? {}).reduce((s, game) => s + Object.values(game).reduce((a, v) => a + v.wrong, 0), 0);
  return log + extra(state.sounds) + extra(state.number);
}

// Things I know / things my brain is growing, as { domainId, itemId } pairs.
export function knownAndGrowing(state, content, config, { perDomain = 4, growMax = 3 } = {}) {
  const know = [], grow = [];
  for (const d of content.domains) {
    const rows = d.items
      .map((it) => ({ domainId: d.id, itemId: it.id, p: masteryOf(state, d.id, it.id, config), n: state.items[`${d.id}:${it.id}`]?.attempts ?? 0 }))
      .filter((r) => r.n > 0);
    know.push(...rows.filter((r) => r.n >= 2 && r.p >= config.unlock.masteryToUnlock).sort((a, b) => b.p - a.p || b.n - a.n).slice(0, perDomain));
    grow.push(...rows.filter((r) => r.n >= 3 && r.p < 0.5));
  }
  grow.sort((a, b) => b.n - a.n);
  return { know, growing: grow.slice(0, growMax) };
}

export function buildSuperpower(state, content, config) {
  const { power } = superPower(state);
  const { know, growing } = knownAndGrowing(state, content, config);
  return { power, know, growing, brave: braveTries(state), sessions: state.sessions, stars: state.stars, bestStreak: state.streak?.best ?? 0 };
}
