// Adaptive engine. Pure functions, no browser APIs, so it can be unit tested.
// Every number it uses comes from data/config.json; every item from data/content.json.

export const resolveText = (value, lang) =>
  value && typeof value === "object" ? value[lang] ?? Object.values(value)[0] : value;

export const itemKey = (domainId, itemId) => `${domainId}:${itemId}`;

export function emptyState() {
  return { child: null, items: {}, confusions: {}, stars: 0, sessions: 0, log: [], levels: {}, stickers: [], streak: { last: null, count: 0, best: 0 }, assessments: [], solved: [], badgesSeen: [], vocab: {}, sounds: {}, number: {} };
}

export function masteryOf(state, domainId, itemId, config) {
  return state.items[itemKey(domainId, itemId)]?.p ?? config.bkt.pInit;
}

// Bayesian Knowledge Tracing: update P(known) after one answer.
export function bktUpdate(p, correct, { pSlip, pGuess, pLearn }) {
  const posterior = correct
    ? (p * (1 - pSlip)) / (p * (1 - pSlip) + (1 - p) * pGuess)
    : (p * pSlip) / (p * pSlip + (1 - p) * (1 - pGuess));
  return posterior + (1 - posterior) * pLearn;
}

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Log one answer: update mastery and the confusion table (recent answers weigh more).
export function recordAnswer(state, domain, { target, chosen, correct, ms, type, rec }, config, now = Date.now()) {
  const key = itemKey(domain.id, target);
  const prev = state.items[key] ?? { p: config.bkt.pInit, attempts: 0, correct: 0 };
  const items = {
    ...state.items,
    [key]: {
      p: bktUpdate(prev.p, correct, config.bkt),
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
    },
  };

  const confusions = {};
  for (const [k, w] of Object.entries(state.confusions)) {
    const decayed = k.startsWith(`${domain.id}|`) ? w * config.confusion.decay : w;
    if (decayed >= 0.05) confusions[k] = decayed;
  }
  if (!correct && chosen != null) {
    const ck = `${domain.id}|${target}>${chosen}`;
    confusions[ck] = (confusions[ck] ?? 0) + 1;
  }

  const stars = state.stars + config.stars.perAnswer + (correct ? config.stars.bonusCorrect : 0);
  const entry = { t: now, d: domain.id, target, chosen, ok: correct, ms };
  if (type) entry.ty = type; // question type: lets the parent report compare seeing / hearing / doing
  if (rec) entry.rec = rec; // 1 = a simpler recovery step, 2 = the re-check afterwards
  const log = [...state.log, entry].slice(-500);
  return { ...state, items, confusions, stars, log };
}

// Items open for practice. More open up as the child masters the ones already open.
export function unlockedCount(domain, state, config) {
  const total = domain.items.length;
  let n = Math.min(config.unlock.initial, total);
  while (n < total) {
    const mean =
      domain.items.slice(0, n).reduce((s, it) => s + masteryOf(state, domain.id, it.id, config), 0) / n;
    if (mean < config.unlock.masteryToUnlock) break;
    n = Math.min(n + config.unlock.step, total);
  }
  return n;
}

const confusionWeightFor = (state, domainId, target) => {
  let w = 0;
  const prefix = `${domainId}|${target}>`;
  for (const [k, v] of Object.entries(state.confusions)) if (k.startsWith(prefix)) w += v;
  return w;
};

export function pickTarget(domain, state, config, recent = [], rng = Math.random, pool = null) {
  const open = pool
    ? domain.items.filter((it) => pool.includes(it.id))
    : domain.items.slice(0, unlockedCount(domain, state, config));
  const s = config.selection;
  let best = null;
  let bestScore = -Infinity;
  for (const it of open) {
    const p = masteryOf(state, domain.id, it.id, config);
    const conf = Math.min(confusionWeightFor(state, domain.id, it.id), 3);
    const recentHit = recent.slice(-s.recentWindow).includes(it.id) ? s.recentPenalty : 0;
    const score = 1 - p + s.confusionBonus * conf + rng() * s.noise - recentHit;
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

export function choiceCount(p, config) {
  const { min, max, moreChoicesAt } = config.choices;
  return Math.min(max, min + moreChoicesAt.filter((t) => p >= t).length);
}

// Distractors, most useful first: letters the child already mixes up with the target,
// then look-alike group mates, then other open items, then anything else.
function pickDistractors(domain, state, config, target, count, openIds, rng, allowed = null) {
  const confused = Object.entries(state.confusions)
    .filter(([k]) => k.startsWith(`${domain.id}|${target.id}>`))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k.split(">")[1]);
  const mates = (domain.groups ?? []).filter((g) => g.includes(target.id)).flat();
  const ok = (id) => !allowed || allowed.has(id);
  const pool = [
    ...confused.filter(ok),
    ...shuffle(mates.filter(ok), rng),
    ...shuffle(openIds, rng),
    ...(allowed ? [] : shuffle(domain.items.map((i) => i.id), rng)),
  ];
  const out = [];
  for (const id of pool) {
    if (id !== target.id && !out.includes(id)) out.push(id);
    if (out.length >= count) break;
  }
  return out;
}

let questionCounter = 0;

// opts.pool  : only these items may be the target (a level, or a twin group)
// opts.known : only these items may appear as answers (what the child has met so far)
// opts.types : override the domain's question types
export function buildQuestion(
  domain,
  state,
  config,
  { recent = [], rng = Math.random, pool = null, known = null, types: only = null } = {}
) {
  const target = pickTarget(domain, state, config, recent, rng, pool);
  const p = masteryOf(state, domain.id, target.id, config);
  const allowed = known ? new Set(known) : null;
  const openIds = known ?? domain.items.slice(0, unlockedCount(domain, state, config)).map((i) => i.id);
  const want = Math.min(choiceCount(p, config), known ? known.length : Infinity);
  const distractors = pickDistractors(domain, state, config, target, want - 1, openIds, rng, allowed);
  const choices = shuffle([target.id, ...distractors], rng);
  const base = { id: ++questionCounter, domainId: domain.id, target: target.id, choices };
  const sel = config.selection;

  const types = only ?? domain.questionTypes;
  if (types.includes("trace") && rng() < sel.traceChance) return { ...base, type: "trace" };

  if (types.includes("parts") && domain.parts?.[target.id] && rng() < sel.partsChance) return { ...base, type: "parts" };
  if (types.includes("dots") && domain.dots?.[target.id] && rng() < sel.dotsChance) return { ...base, type: "dots" };

  if (types.includes("example") && domain.examples?.[target.id] && rng() < sel.exampleChance) {
    const list = domain.examples[target.id];
    return { ...base, type: "example", example: list[Math.floor(rng() * list.length)] };
  }

  const itemIds = new Set(domain.items.map((i) => i.id));
  const buildable = (domain.words ?? []).filter((w) => {
    const chars = Array.from(w.text);
    return (
      chars.length <= sel.buildMaxLen &&
      chars.includes(target.id) &&
      chars.every((c) => (allowed ? allowed.has(c) : itemIds.has(c)))
    );
  });
  if (types.includes("build") && buildable.length && p >= sel.missingFromMastery && rng() < sel.buildChance) {
    const word = buildable[Math.floor(rng() * buildable.length)];
    const chars = Array.from(word.text);
    const tiles = shuffle(chars.map((ch, k) => ({ k, ch })), rng);
    return { ...base, type: "build", word: { ...word, chars }, tiles };
  }

  if (types.includes("bake") && rng() < sel.bakeChance) return { ...base, type: "bake", count: target.n };

  if (types.includes("count") && (!types.includes("sound") || rng() < sel.countChance)) {
    if (types.includes("hop") && rng() < sel.hopChance) return { ...base, type: "hop", count: target.n };
    const emoji = domain.countEmoji[Math.floor(rng() * domain.countEmoji.length)];
    return { ...base, type: "count", count: target.n, emoji };
  }
  const words = (domain.words ?? []).filter((w) => Array.from(w.text).includes(target.id));
  if (types.includes("missing") && words.length && p >= sel.missingFromMastery && rng() < 0.5) {
    const word = words[Math.floor(rng() * words.length)];
    const chars = Array.from(word.text);
    return { ...base, type: "missing", word: { ...word, chars, blankIndex: chars.indexOf(target.id) } };
  }
  return { ...base, type: "sound", style: rng() < sel.popChance ? "pop" : "buttons" };
}

// ---------- difficulty recovery ----------
// An item missed twice in this session (and not yet given a simpler step) -> step back to a smaller
// question (2 choices, with sound), and bring it back a little later as a re-check.
// `answers` = this session so far. Returns the item to help, or null.
export const recoveryTarget = (answers, n = 2) => {
  const last = answers.at(-1);
  if (!last || last.correct || last.recovery) return null;
  const mine = answers.filter((a) => a.target === last.target);
  if (mine.some((a) => a.recovery)) return null;
  return mine.filter((a) => !a.correct).length >= n ? last.target : null;
};

export function buildRecoveryQuestion(domain, state, config, target, rng = Math.random) {
  const q = buildQuestion(domain, state, config, { pool: [target], types: ["sound"], rng });
  const confused = q.choices.filter((c) => c !== target);
  const other = confused[0] ?? domain.items.find((i) => i.id !== target)?.id;
  return { ...q, type: "sound", style: "buttons", choices: shuffle([target, other].filter((x) => x != null), rng), recovery: 1 };
}

// The same item again in its normal form, after a recovery step went well.
export function buildRecheckQuestion(domain, state, config, target, rng = Math.random) {
  return { ...buildQuestion(domain, state, config, { pool: [target], rng }), recheck: true };
}

// ---------- shape games ----------
// Which letter do these dots make? (null when no letter matches)
export const dotsLetter = (domain, skeleton, above, below) =>
  Object.entries(domain.dots ?? {}).find(([, d]) => d.skeleton === skeleton && d.above === above && d.below === below)?.[0] ?? null;
// Which letter does a ball on this side of the stick make? (b d p q)
export const partsLetter = (domain, x, y) =>
  Object.entries(domain.parts ?? {}).find(([, p]) => p.x === x && p.y === y)?.[0] ?? null;

// ---------- streak + rewards ----------
const localDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const dayKey = localDay;
const prevDay = (key) => new Date(Date.parse(key) - 864e5).toISOString().slice(0, 10);

// Call once per finished game. Same day = no change; yesterday = +1; otherwise restart at 1.
export function touchStreak(state, today = localDay()) {
  const s = state.streak ?? { last: null, count: 0, best: 0 };
  if (s.last === today) return state;
  const count = s.last === prevDay(today) ? s.count + 1 : 1;
  return { ...state, streak: { last: today, count, best: Math.max(s.best, count) } };
}

// The streak a child sees today: it is broken if they did not play today or yesterday.
export function liveStreak(state, today = localDay()) {
  const s = state.streak;
  if (!s?.last) return 0;
  return s.last === today || s.last === prevDay(today) ? s.count : 0;
}

export function badgeStats(state) {
  const lv = Object.values(state.levels ?? {}).flatMap((w) => Object.values(w));
  return {
    sessions: state.sessions,
    stars: state.stars,
    levels: lv.filter((l) => l.stars >= 1).length,
    perfect: lv.filter((l) => l.stars >= 3).length,
    streak: state.streak?.best ?? 0,
    missions: state.solved?.length ?? 0,
    stickers: state.stickers?.length ?? 0,
    checkups: state.assessments?.length ?? 0,
    words: Object.values(state.vocab ?? {}).filter((v) => v.right >= 2).length,
  };
}

export const earnedBadges = (state, rewards) => {
  const st = badgeStats(state);
  return rewards.badges.filter((b) => st[b.stat] >= b.value).map((b) => b.id);
};

export const unlockedHats = (state, rewards) => rewards.hats.filter((h) => state.stars >= h.stars).map((h) => h.id);

// ---------- check-up (assessment) ----------
// Look-alike pairs first (that is where the mix-ups hide), then other items. Same length every time.
export function assessmentPlan(domain, config, rng = Math.random) {
  const n = Math.min(config.assessment.questions, domain.items.length);
  const ids = new Set(domain.items.map((i) => i.id));
  const out = [];
  for (const g of shuffle(domain.groups ?? [], rng)) {
    for (const id of g) if (ids.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= n) break;
  }
  for (const id of shuffle([...ids], rng)) if (out.length < n && !out.includes(id)) out.push(id);
  return out.slice(0, n);
}

export function buildAssessmentQuestion(domain, state, config, target, rng = Math.random) {
  const q = buildQuestion(domain, state, config, { pool: [target], types: ["sound"], rng });
  return { ...q, style: "buttons" };
}

// answers: [{target, chosen, correct}]
export function summarizeAssessment(domain, answers, levelsData = { worlds: [] }) {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct).map((a) => a.target);
  const pairs = new Map();
  for (const a of answers) {
    if (a.correct || !a.chosen) continue;
    const key = [a.target, a.chosen].sort().join("|");
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  const levels = levelsData.worlds.find((w) => w.domain === domain.id)?.levels ?? [];
  const next = levels.findIndex((l) => l.items.some((id) => missed.includes(id)));
  return {
    total, correct, pct: total ? correct / total : 0, missed,
    pairs: [...pairs.entries()].map(([k, n]) => ({ ids: k.split("|"), n })).sort((a, b) => b.n - a.n),
    recommendLevel: next >= 0 ? levels[next].id : null,
  };
}

export const addAssessment = (state, record, config) => ({
  ...state,
  assessments: [...state.assessments, record].slice(-config.assessment.maxKept),
});

// ---------- monster feeder ----------
// One round: feed the monster `targets` copies of the target; the pile also holds look-alike decoys.
export function buildMonsterRound(domain, state, config, { recent = [], rng = Math.random } = {}) {
  const q = buildQuestion(domain, state, config, { recent, rng, types: ["sound"] });
  const m = config.monster;
  const pile = [];
  for (let i = 0; i < m.targets; i++) pile.push({ k: `t${i}`, id: q.target });
  q.choices.filter((c) => c !== q.target).forEach((id, i) => {
    for (let j = 0; j < m.distractorCopies; j++) pile.push({ k: `d${i}-${j}`, id });
  });
  return { target: q.target, need: m.targets, pile: shuffle(pile, rng) };
}

// ---------- match games ----------
export function recordVocab(state, id, correct) {
  const v = state.vocab?.[id] ?? { right: 0, wrong: 0 };
  return { ...state, vocab: { ...state.vocab, [id]: { right: v.right + (correct ? 1 : 0), wrong: v.wrong + (correct ? 0 : 1) } } };
}

// Weak and new words first; words from the last round are held back so rounds feel fresh.
export function buildMatchRound(words, state, config, { lang = "en", rng = Math.random, recent = [] } = {}) {
  const score = (w) => {
    const v = state.vocab?.[w.id] ?? { right: 0, wrong: 0 };
    return v.wrong * 1.5 - v.right * 0.4 + (v.right + v.wrong === 0 ? 0.5 : 0) + rng() - (recent.includes(w.id) ? 3 : 0);
  };
  const chosen = [...words].map((w) => [score(w), w]).sort((a, b) => b[0] - a[0]).slice(0, Math.min(config.match.pairs, words.length)).map((x) => x[1]);
  const pairs = chosen.map((w) => ({ k: w.id, left: { emoji: w.emoji, image: w.image, say: w[lang], audio: w.audio?.[lang] }, right: { text: w[lang] } }));
  return { mode: "vocab", pairs, lefts: shuffle(pairs.map((p) => p.k), rng), rights: shuffle(pairs.map((p) => p.k), rng) };
}

export function buildShapeMatchRound(domain, state, config, { lang = "en", rng = Math.random, recent = [] } = {}) {
  const chosen = domain.items
    .map((it) => [masteryOf(state, domain.id, it.id, config) + rng() * 0.4 + (recent.includes(it.id) ? 2 : 0), it])
    .sort((a, b) => a[0] - b[0])
    .slice(0, Math.min(config.match.pairs, domain.items.length))
    .map((x) => x[1]);
  const pairs = chosen.map((it) => {
    const list = domain.examples[it.id];
    const ex = list[Math.floor(rng() * list.length)];
    return { k: it.id, left: { emoji: ex.emoji, say: resolveText(ex.text, lang) }, right: { shape: it.id, text: resolveText(it.label, lang) } };
  });
  return { mode: "shapes", pairs, lefts: shuffle(pairs.map((p) => p.k), rng), rights: shuffle(pairs.map((p) => p.k), rng) };
}

// ---------- levels ----------
export const levelStars = (correct, total, config) => {
  const r = total ? correct / total : 0;
  return config.levels.starAt.filter((t) => r >= t).length;
};

export const levelProgress = (state, domainId, levelId) => state.levels?.[domainId]?.[levelId] ?? { stars: 0, plays: 0 };

export function isLevelUnlocked(world, index, state, config) {
  if (index === 0) return true;
  return levelProgress(state, world.domain, world.levels[index - 1].id).stars >= config.levels.minStarsToUnlock;
}

// What a level may ask: its own items as targets, plus review of earlier levels; answers only from what was met.
export function levelContext(world, index) {
  const upTo = world.levels.slice(0, index + 1).flatMap((l) => l.items);
  return {
    pool: world.levels[index].items,
    known: [...new Set(upTo)],
    review: [...new Set(world.levels.slice(0, index).flatMap((l) => l.items))],
  };
}

export function buildLevelQuestion(domain, ctx, state, config, { recent = [], rng = Math.random } = {}) {
  const review = ctx.review.length > 0 && rng() < config.levels.reviewChance;
  return buildQuestion(domain, state, config, { recent, rng, pool: review ? ctx.review : ctx.pool, known: ctx.known });
}

export function completeLevel(state, world, level, stars, config) {
  const prev = levelProgress(state, world.domain, level.id);
  const best = Math.max(prev.stars, stars);
  const bonus = Math.max(0, config.levels.bonusStars[best] - config.levels.bonusStars[prev.stars]);
  const key = `${world.domain}:${level.id}`;
  const stickers = stars >= 1 && !state.stickers.includes(key) ? [...state.stickers, key] : state.stickers;
  return {
    ...state,
    stars: state.stars + bonus,
    stickers,
    levels: {
      ...state.levels,
      [world.domain]: { ...state.levels?.[world.domain], [level.id]: { stars: best, plays: prev.plays + 1 } },
    },
  };
}

// ---------- twin detective ----------
export function groupIndexOf(domain, ...ids) {
  const groups = domain.groups ?? [];
  const both = groups.findIndex((g) => ids.every((id) => g.includes(id)));
  return both >= 0 ? both : groups.findIndex((g) => g.includes(ids[0]));
}

export const levelTwinGroups = (domain, level) =>
  (domain.groups ?? [])
    .map((g, i) => ({ i, n: g.filter((id) => level.items.includes(id)).length }))
    .filter((x) => x.n >= 2)
    .map((x) => x.i);

// A look-alike group becomes a mission once a mix-up inside it is flagged. Heaviest first.
export function findMissions(state, content, config) {
  const out = [];
  for (const domain of content.domains) {
    const byGroup = new Map();
    for (const [k, w] of Object.entries(state.confusions)) {
      if (!k.startsWith(`${domain.id}|`) || w < config.confusion.flagAt) continue;
      const [target, chosen] = k.split("|")[1].split(">");
      const gi = groupIndexOf(domain, target, chosen);
      if (gi < 0) continue;
      const cur = byGroup.get(gi) ?? { weight: 0, top: 0, target, chosen };
      cur.weight += w;
      if (w > cur.top) Object.assign(cur, { top: w, target, chosen });
      byGroup.set(gi, cur);
    }
    for (const [gi, v] of byGroup)
      out.push({ domainId: domain.id, groupIndex: gi, ids: domain.groups[gi], weight: v.weight, target: v.target, chosen: v.chosen });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

// Numbers for the parent dashboard.
export function summarize(state, content, config, levelsData = { worlds: [] }) {
  return content.domains.map((domain) => {
    const n = unlockedCount(domain, state, config);
    const open = domain.items.slice(0, n);
    const stats = domain.items.map((it) => ({ it, ...(state.items[itemKey(domain.id, it.id)] ?? null) }));
    const attempts = stats.reduce((s, x) => s + (x.attempts ?? 0), 0);
    const correct = stats.reduce((s, x) => s + (x.correct ?? 0), 0);
    const mean = open.reduce((s, it) => s + masteryOf(state, domain.id, it.id, config), 0) / (open.length || 1);
    const needs = stats
      .filter((x) => x.attempts > 0 && x.p < config.thresholds.needsPractice)
      .sort((a, b) => a.p - b.p)
      .slice(0, 5)
      .map((x) => ({ id: x.it.id, p: x.p }));
    const strong = stats.filter((x) => x.attempts > 0 && x.p >= config.thresholds.mastered).length;
    const confusions = Object.entries(state.confusions)
      .filter(([k, w]) => k.startsWith(`${domain.id}|`) && w >= config.confusion.flagAt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, w]) => {
        const [target, chosen] = k.split("|")[1].split(">");
        return { target, chosen, weight: w };
      });
    const lv = levelsData.worlds.find((w) => w.domain === domain.id)?.levels ?? [];
    const levelsCleared = lv.filter((l) => levelProgress(state, domain.id, l.id).stars >= 1).length;
    return { domain, unlocked: n, mean, attempts, correct, needs, strong, confusions, levelsCleared, levelsTotal: lv.length };
  });
}

// Memory board: pairs of (item label, picture). Weak items are preferred; wrong flips are logged by the UI.
export function buildMemory(domain, state, config, { rng = Math.random } = {}) {
  const rule = domain.memory;
  if (!rule) return null;
  const pictureFor = (it, idx) => {
    if (rule.picture === "count") {
      if (rule.maxN && it.n > rule.maxN) return null;
      return Array(it.n).fill(domain.countEmoji[idx % domain.countEmoji.length]).join("");
    }
    if (rule.picture === "examples") return domain.examples?.[it.id]?.[0]?.emoji ?? null;
    const w = (domain.words ?? []).find((x) => ("أإآ".includes(Array.from(x.text)[0]) ? "ا" : Array.from(x.text)[0]) === it.id);
    return w ? w.emoji : null;
  };
  const open = new Set(domain.items.slice(0, unlockedCount(domain, state, config)).map((i) => i.id));
  const candidates = domain.items
    .map((it, idx) => ({ id: it.id, picture: pictureFor(it, idx) }))
    .filter((c) => c.picture)
    .map((c) => ({
      ...c,
      score: (open.has(c.id) ? 0 : 5) + masteryOf(state, domain.id, c.id, config) + rng() * 0.3,
    }))
    .sort((a, b) => a.score - b.score);
  const pairs = [];
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c.picture)) continue;
    seen.add(c.picture);
    pairs.push({ id: c.id, picture: c.picture });
    if (pairs.length >= config.memory.pairs) break;
  }
  const cards = shuffle(
    pairs.flatMap((p) => [
      { key: `${p.id}-a`, pairId: p.id, kind: "a", picture: p.picture },
      { key: `${p.id}-b`, pairId: p.id, kind: "b", picture: p.picture },
    ]),
    rng
  );
  return { pairs, cards };
}
