// Simulates a child who keeps mixing up b and d, then checks the engine reacts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyState, recordAnswer, buildQuestion, bktUpdate, unlockedCount, masteryOf, summarize, buildMemory,
  touchStreak, liveStreak, earnedBadges, unlockedHats, assessmentPlan, buildAssessmentQuestion, summarizeAssessment, addAssessment, buildMonsterRound, buildMatchRound, buildShapeMatchRound, recordVocab,
  dotsLetter, partsLetter, findMissions, completeLevel, isLevelUnlocked, levelStars, levelContext, buildLevelQuestion, levelProgress,
} from "../lib/engine.js";
import { prePost, summaryRows, checkupRows, toCSV } from "../lib/report.js";
import { normName, findByName, pickMore, makeBackup, parseBackup } from "../lib/accounts.js";
import { activitiesFor, buildWorksheet } from "../lib/worksheets.js";
import { formatOf, formatStats, bestFormat, trend, skillProfile, explain } from "../lib/insights.js";
import { recoveryTarget, buildRecoveryQuestion, buildRecheckQuestion } from "../lib/engine.js";
import { scoreTrace } from "../lib/trace.js";
import { youtubeId } from "../lib/youtube.js";

const config = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url)));
const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));
const en = content.domains.find((d) => d.id === "en-letters");

// seeded random so the test is repeatable
let seed = 42;
const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

// 1. BKT behaves sensibly
const p0 = config.bkt.pInit;
assert(bktUpdate(p0, true, config.bkt) > p0, "correct answer raises mastery");
assert(bktUpdate(p0, false, config.bkt) < bktUpdate(p0, true, config.bkt), "wrong answer lowers it vs correct");

// 2. Simulated child
let state = emptyState();
const recent = [];
const seenWithD = { b: 0, bTotal: 0 };
let peak = null;
for (let i = 0; i < 120; i++) {
  const q = buildQuestion(en, state, config, { recent, rng });
  recent.push(q.target);
  if (q.target === "b") {
    seenWithD.bTotal++;
    if (q.choices.includes("d")) seenWithD.b++;
  }
  let chosen = q.target;
  let correct = true;
  const confusable = ["b", "d"].includes(q.target) && q.choices.includes(q.target === "b" ? "d" : "b");
  if (confusable && rng() < 0.6) {
    chosen = q.target === "b" ? "d" : "b";
    correct = false;
  } else if (!confusable && rng() < 0.1) {
    chosen = q.choices.find((c) => c !== q.target);
    correct = false;
  }
  state = recordAnswer(state, en, { target: q.target, chosen, correct, ms: 1000 }, config);
  // confusions fade as the child moves on, so record the moment b/d was flagged
  if (!peak) {
    const hit = summarize(state, content, config).find((s) => s.domain.id === "en-letters").confusions[0];
    if (hit) peak = hit;
  }
}

const summary = summarize(state, content, config).find((s) => s.domain.id === "en-letters");
const top = peak;
console.log("unlocked letters:", summary.unlocked, "of", en.items.length);
console.log("mean mastery:", summary.mean.toFixed(2));
console.log("top confusions:", summary.confusions.map((c) => `${c.chosen}->${c.target} (${c.weight.toFixed(1)})`).join(", "));
console.log("b questions that offered d:", seenWithD.b, "/", seenWithD.bTotal);

assert(top && ["b", "d"].includes(top.target) && ["b", "d"].includes(top.chosen), "b/d is the top flagged confusion");
assert(seenWithD.b / seenWithD.bTotal > 0.6, "engine keeps offering d when b is the target");
assert(summary.unlocked >= config.unlock.initial, "letters unlock");
assert(summary.unlocked <= en.items.length, "never unlocks more than exist");
assert(masteryOf(state, "en-letters", "a", config) >= 0 && masteryOf(state, "en-letters", "a", config) <= 1, "mastery stays in 0..1");

// 3. every question is well formed, in all domains
for (const d of content.domains) {
  for (let i = 0; i < 200; i++) {
    const q = buildQuestion(d, emptyState(), config, { rng });
    assert(q.choices.includes(q.target), `${d.id}: target in choices`);
    assert.equal(new Set(q.choices).size, q.choices.length, `${d.id}: no duplicate choices`);
    assert(q.choices.length >= config.choices.min, `${d.id}: enough choices`);
    if (q.type === "missing") assert.equal(q.word.chars[q.word.blankIndex], q.target, `${d.id}: blank is the target`);
  }
}

// 4. memory boards
for (const d of content.domains) {
  const m = buildMemory(d, emptyState(), config, { rng });
  assert(m, `${d.id}: has a memory board`);
  assert.equal(m.pairs.length, config.memory.pairs, `${d.id}: enough pairs`);
  assert.equal(m.cards.length, config.memory.pairs * 2, `${d.id}: two cards per pair`);
  assert.equal(new Set(m.pairs.map((p) => p.picture)).size, m.pairs.length, `${d.id}: pictures differ`);
}

// 5. tracing score: a line down the middle of a bar passes; a scribble elsewhere fails; nothing fails
const W = 40, H = 40;
const blank = () => new Uint8Array(W * H * 4);
const fill = (a, x0, x1, y0, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[(y * W + x) * 4 + 3] = 255; return a; };
const tcfg = config.tracing;
const mask = fill(blank(), 18, 22, 5, 35);
const wide = fill(blank(), 12, 28, 0, 40);
assert(scoreTrace(mask, wide, fill(blank(), 16, 24, 5, 35), tcfg).pass, "tracing along the letter passes");
assert(!scoreTrace(mask, wide, fill(blank(), 0, 8, 0, 40), tcfg).pass, "drawing away from the letter fails");
assert(!scoreTrace(mask, wide, blank(), tcfg).pass, "drawing nothing fails");
assert(!scoreTrace(mask, wide, fill(blank(), 16, 24, 5, 12), tcfg).pass, "covering a small part fails");

// 6. YouTube links
assert.equal(youtubeId("1pCFfkqmU2A"), "1pCFfkqmU2A");
assert.equal(youtubeId("https://www.youtube.com/watch?v=1pCFfkqmU2A&t=5"), "1pCFfkqmU2A");
assert.equal(youtubeId("https://youtu.be/1pCFfkqmU2A?si=x"), "1pCFfkqmU2A");
assert.equal(youtubeId("https://www.youtube.com/shorts/LkiS-KTfTbM"), "LkiS-KTfTbM");
assert.equal(youtubeId("https://example.com/watch?v=1pCFfkqmU2A"), null);
assert.equal(youtubeId("not a link"), null);
const lib = JSON.parse(readFileSync(new URL("../data/library.json", import.meta.url)));
for (const it of lib.items) assert(it.youtube ? youtubeId(it.youtube) : it.lines?.length, `${it.id}: valid video link or lines`);
console.log("all checks passed");

// 5. levels, missions, build questions
const levels = JSON.parse(readFileSync(new URL("../data/levels.json", import.meta.url)));
const world = levels.worlds.find((w) => w.domain === "en-letters");
for (const w of levels.worlds) {
  const d = content.domains.find((x) => x.id === w.domain);
  const ids = new Set(d.items.map((i) => i.id));
  for (const l of w.levels) for (const id of l.items) assert(ids.has(id), `${l.id}: ${id} exists`);
}
assert(isLevelUnlocked(world, 0, emptyState(), config), "first level open");
assert(!isLevelUnlocked(world, 1, emptyState(), config), "second level locked");
assert.equal(levelStars(8, 8, config), 3);
assert.equal(levelStars(3, 8, config), 0);
let ls = completeLevel(emptyState(), world, world.levels[0], 2, config);
assert(isLevelUnlocked(world, 1, ls, config), "2 stars unlocks next");
assert(ls.stickers.includes("en-letters:en-1"), "sticker earned");
const stars1 = ls.stars;
ls = completeLevel(ls, world, world.levels[0], 1, config);
assert.equal(ls.stars, stars1, "worse replay gives no extra bonus");
assert.equal(levelProgress(ls, "en-letters", "en-1").stars, 2, "best stars kept");

// level questions only use letters the child has met
const ctx = levelContext(world, 1);
for (let i = 0; i < 300; i++) {
  const q = buildLevelQuestion(en, ctx, emptyState(), config, { rng });
  assert(q.choices.every((c) => ctx.known.includes(c)), "choices limited to known letters");
  if (q.type === "build") {
    assert(q.word.chars.every((c) => ctx.known.includes(c)), "build word uses known letters");
    assert.equal(q.tiles.length, q.word.chars.length);
  }
}
let sawBuild = false;
for (let i = 0; i < 400 && !sawBuild; i++) {
  const st = { ...emptyState(), items: Object.fromEntries(en.items.map((it) => [`en-letters:${it.id}`, { p: 0.9, attempts: 5, correct: 5 }])) };
  sawBuild = buildQuestion(en, st, config, { rng }).type === "build";
}
assert(sawBuild, "build questions appear once letters are known");

// a flagged mix-up becomes a mission, and drilling it clears the mission
let ms = emptyState();
for (let i = 0; i < 4; i++) ms = recordAnswer(ms, en, { target: "b", chosen: "d", correct: false, ms: 900 }, config);
const missions = findMissions(ms, content, config);
assert(missions.length === 1 && missions[0].ids.includes("b") && missions[0].ids.includes("d"), "b/d mission found");
const grp = en.groups[missions[0].groupIndex];
for (let i = 0; i < 40; i++) {
  const q = buildQuestion(en, ms, config, { rng, pool: grp, known: grp, types: ["sound"] });
  assert(q.choices.every((c) => grp.includes(c)), "drill stays in the group");
  ms = recordAnswer(ms, en, { target: q.target, chosen: q.target, correct: true, ms: 800 }, config);
}
assert.equal(findMissions(ms, content, config).length, 0, "solved case disappears");
console.log("levels + missions ok");

// 6. shape games: every dot pattern / ball position maps back to exactly its own letter
const ar = content.domains.find((d) => d.id === "ar-letters");
for (const [id, d] of Object.entries(ar.dots)) assert.equal(dotsLetter(ar, d.skeleton, d.above, d.below), id, `dots ${id} unique`);
for (const [id, p] of Object.entries(en.parts)) assert.equal(partsLetter(en, p.x, p.y), id, `parts ${id} unique`);
const seenTypes = new Set();
const mastered = { ...emptyState(), items: Object.fromEntries(content.domains.flatMap((d) => d.items.map((it) => [`${d.id}:${it.id}`, { p: 0.5, attempts: 3, correct: 2 }]))) };
for (const d of content.domains) for (let i = 0; i < 300; i++) seenTypes.add(buildQuestion(d, mastered, config, { rng }).type);
for (const t of ["parts", "dots", "hop", "bake", "build", "trace", "count", "sound", "missing"]) assert(seenTypes.has(t), `question type ${t} is produced`);
console.log("shape games ok");

// 7. rewards, check-up, monster
const rewards = JSON.parse(readFileSync(new URL("../data/rewards.json", import.meta.url)));
let st = touchStreak(emptyState(), "2026-11-01");
assert.equal(st.streak.count, 1);
assert.equal(touchStreak(st, "2026-11-01"), st, "same day no change");
st = touchStreak(st, "2026-11-02");
assert.equal(st.streak.count, 2, "next day +1");
st = touchStreak(st, "2026-11-05");
assert.equal(st.streak.count, 1, "gap resets");
assert.equal(st.streak.best, 2, "best kept");
assert.equal(liveStreak(st, "2026-11-05"), 1);
assert.equal(liveStreak(st, "2026-11-09"), 0, "old streak is not shown");
assert.equal(touchStreak(emptyState(), "2026-03-01").streak.count, 1);
assert.equal(touchStreak(touchStreak(emptyState(), "2026-02-28"), "2026-03-01").streak.count, 2, "month boundary");

assert.deepEqual(earnedBadges(emptyState(), rewards), []);
const rich = { ...emptyState(), stars: 60, sessions: 2, stickers: ["a", "b", "c", "d", "e"], streak: { last: "x", count: 3, best: 3 } };
const got = earnedBadges(rich, rewards);
for (const id of ["first-steps", "star-10", "star-50", "streak-3", "sticker-5"]) assert(got.includes(id), `badge ${id}`);
assert(!got.includes("star-150"), "not yet");
assert.deepEqual(unlockedHats({ ...emptyState(), stars: 25 }, rewards), ["none", "flower", "cap"]);

for (const d of content.domains) {
  const plan = assessmentPlan(d, config, rng);
  assert.equal(plan.length, Math.min(config.assessment.questions, d.items.length));
  assert.equal(new Set(plan).size, plan.length, "no repeats in plan");
  for (const id of plan) {
    const q = buildAssessmentQuestion(d, emptyState(), config, id, rng);
    assert.equal(q.target, id); assert(q.choices.includes(id)); assert.equal(q.type, "sound"); assert.equal(q.style, "buttons");
  }
}
const sum = summarizeAssessment(en, [
  { target: "b", chosen: "d", correct: false }, { target: "d", chosen: "b", correct: false },
  { target: "a", chosen: "a", correct: true }, { target: "p", chosen: "p", correct: true },
], levels);
assert.equal(sum.correct, 2); assert.equal(sum.pairs.length, 1); assert.equal(sum.pairs[0].n, 2, "b/d counted once as a pair");
assert.equal(sum.recommendLevel, "en-1", "b is in level 1");
assert.equal(addAssessment(emptyState(), { id: 1 }, config).assessments.length, 1);

for (const d of content.domains) for (let i = 0; i < 100; i++) {
  const r = buildMonsterRound(d, emptyState(), config, { rng });
  assert.equal(r.pile.filter((x) => x.id === r.target).length, config.monster.targets);
  assert(r.pile.some((x) => x.id !== r.target), "decoys present");
  assert.equal(new Set(r.pile.map((x) => x.k)).size, r.pile.length, "unique keys");
}
console.log("rewards + check-up + monster ok");

// 8. shapes domain and match games
const vocab = JSON.parse(readFileSync(new URL("../data/vocab.json", import.meta.url)));
const shapes = content.domains.find((d) => d.id === "shapes");
const twinsData = JSON.parse(readFileSync(new URL("../data/twins.json", import.meta.url)));
for (const it of shapes.items) {
  assert(shapes.examples[it.id]?.length >= 3, `${it.id} has 3+ real-life examples`);
  assert(it.fact.en && it.fact.ar && it.color, `${it.id} has fact and colour`);
}
for (const g of shapes.groups) for (const id of g) assert(twinsData.shapes[id], `twin clue for ${id}`);
const mem = buildMemory(shapes, emptyState(), config, { rng });
assert(mem && mem.cards.length === config.memory.pairs * 2, "shape memory board");
let sawExample = false;
for (let i = 0; i < 300; i++) {
  const q = buildQuestion(shapes, mastered, config, { rng });
  assert(q.choices.includes(q.target));
  if (q.type === "example") { sawExample = true; assert(shapes.examples[q.target].some((e) => e.emoji === q.example.emoji), "example belongs to target"); }
}
assert(sawExample, "example questions appear");
for (const lang of ["en", "ar"]) {
  const r = buildMatchRound(vocab.words, emptyState(), config, { lang, rng });
  assert.equal(r.pairs.length, config.match.pairs);
  assert.equal(new Set(r.pairs.map((p) => p.k)).size, r.pairs.length, "unique words");
  assert(r.pairs.every((p) => p.right.text), `word text in ${lang}`);
}
assert(vocab.words.every((w) => w.en && w.ar && w.emoji && vocab.categories.some((c) => c.id === w.cat)), "vocab complete");
let vs = emptyState();
vs = recordVocab(vs, "cat", false); vs = recordVocab(vs, "cat", false); vs = recordVocab(vs, "dog", true);
let weakHits = 0;
for (let i = 0; i < 100; i++) if (buildMatchRound(vocab.words.filter((w) => w.cat === "animals"), vs, config, { rng }).pairs.some((p) => p.k === "cat")) weakHits++;
assert(weakHits === 100, "a word the child got wrong is always practised again");
const sm = buildShapeMatchRound(shapes, emptyState(), config, { rng });
assert.equal(sm.pairs.length, config.match.pairs); assert(sm.pairs.every((p) => p.right.shape && p.left.emoji));
console.log("shapes + match ok");

// 9. every piece of visible text exists in both languages
const strs = JSON.parse(readFileSync(new URL("../data/strings.json", import.meta.url)));
assert.deepEqual(Object.keys(strs.en).sort(), Object.keys(strs.ar).sort(), "strings.json: same keys in en and ar");
for (const k of Object.keys(strs.en)) {
  const a = strs.en[k], b = strs.ar[k];
  assert.equal(typeof a, typeof b, `${k}: same type`);
  if (Array.isArray(a)) assert(a.length && b.length, `${k}: not empty`);
  else if (k !== "dir" && k !== "speechLang") assert(String(a).trim() && String(b).trim(), `${k}: not empty`);
  const vars = (s) => (String(s).match(/\{\w+\}/g) ?? []).sort().join();
  if (!Array.isArray(a)) assert.equal(vars(a), vars(b), `${k}: same {placeholders} in en and ar`);
}
const both = (v, where) => { if (v && typeof v === "object" && !Array.isArray(v)) { if ("en" in v || "ar" in v) { assert(String(v.en ?? "").trim() && String(v.ar ?? "").trim(), `${where} has en and ar`); } else for (const [k, x] of Object.entries(v)) both(x, `${where}.${k}`); } else if (Array.isArray(v)) v.forEach((x, i) => both(x, `${where}[${i}]`)); };
const aboutData = JSON.parse(readFileSync(new URL("../data/about.json", import.meta.url)));
const libData = JSON.parse(readFileSync(new URL("../data/library.json", import.meta.url)));
both(aboutData, "about"); both(twinsData, "twins"); both(rewards, "rewards"); both(levels, "levels");
both(vocab.categories, "vocab.categories");
for (const d of content.domains) both({ title: d.title, items: d.items.map((i) => ({ label: i.label, say: i.say })).filter((x) => typeof x.say === "object" && !("en" in x.say === false && "ar" in x.say === false)) }, `domain ${d.id}`);
console.log("bilingual content ok");

// 10. class report
const kids = [
  { id: "p1", state: { ...emptyState(), child: { name: "لينا", lang: "ar" }, sessions: 3, stars: 20,
      assessments: [{ at: Date.parse("2026-11-01"), domainId: "ar-letters", total: 10, correct: 4, answers: [] }, { at: Date.parse("2026-11-08"), domainId: "ar-letters", total: 10, correct: 7, answers: [] }] } },
  { id: "p2", state: { ...emptyState(), child: { name: 'Omar, "Jr"', lang: "en" } } },
];
const pp = prePost(kids[0].state.assessments, "ar-letters");
assert.equal(pp.n, 2); assert.equal(Math.round(pp.change * 100), 30, "40% -> 70% is +30 points");
assert.equal(prePost(kids[1].state.assessments, "ar-letters"), null);
const reportCtx = { content, config, levels, labelOf: (d, id) => id };
const srows = summaryRows(kids, reportCtx);
assert.equal(srows.length, kids.length * content.domains.length, "one row per child per area");
const lina = srows.find((r) => r.child_id === "p1" && r.area === "ar-letters");
assert.equal(lina.checkup_first_pct, 40); assert.equal(lina.checkup_latest_pct, 70); assert.equal(lina.checkup_change_pts, 30);
assert.equal(checkupRows(kids).length, 2); assert.equal(checkupRows(kids)[1].attempt_no, 2);
const csv = toCSV(srows);
assert(csv.startsWith("\uFEFFchild_id,child,"), "BOM + header");
assert(csv.includes("لينا"), "Arabic names kept");
assert(csv.includes('"Omar, ""Jr"""'), "commas and quotes are escaped");
assert.equal(csv.split("\r\n").length, srows.length + 1);
console.log("class report ok");

// 11. number bakery
const nums = content.domains.find((d) => d.id === "numbers");
let bakes = 0;
for (let i = 0; i < 400; i++) {
  const q = buildQuestion(nums, mastered, config, { rng });
  if (q.type === "bake") { bakes++; assert.equal(q.count, nums.items.find((x) => x.id === q.target).n, "bake count equals the target number"); assert(q.count <= config.bakery.maxCookies, "fits on the tray"); }
}
assert(bakes > 20, "bake questions appear regularly");
assert(nums.items.every((i) => i.n <= config.bakery.maxCookies), "tray holds every number");
console.log("bakery ok");

// ---- sign in by name + backup, and printable worksheets
{
  const J = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
  const cont = J("content"), cfg = J("config"), voc = J("vocab");
  assert.equal(normName("  ليلى "), normName("ليلي"));
  assert.equal(normName("Lina"), normName("lINA "));
  assert.equal(normName("أحمد"), normName("احمد"));
  const a = { ...emptyState(), child: { name: "Lina" }, stars: 5 };
  const b = { ...emptyState(), child: { name: "Omar" }, stars: 1 };
  const rows = [{ id: "p1", state: a }, { id: "p2", state: b }, { id: "p3", state: emptyState() }];
  assert.equal(findByName(rows, " lina ").id, "p1");
  assert.equal(findByName(rows, "Nour"), null);
  assert.equal(findByName(rows, ""), null);
  assert.equal(pickMore(a, { ...a, stars: 9 }).stars, 9, "keeps the one with more progress");
  assert.equal(pickMore(a, { ...a, stars: 2 }).stars, 5);
  const back = makeBackup(rows);
  assert.equal(back.profiles.length, 2, "unnamed profiles are not exported");
  assert.equal(parseBackup(JSON.stringify(back)).entries.length, 2);
  assert.equal(parseBackup(JSON.stringify(a)).entries.length, 1, "single child file works");
  assert.equal(parseBackup(JSON.stringify([{ id: "x", ...a }])).entries[0].child.name, "Lina");
  assert(parseBackup("nope").error && parseBackup("{}").error);

  const pictureOf = (d, it) => {
    if (d.countEmoji) return { emoji: d.countEmoji[0] };
    const norm = (c) => ("أإآ".includes(c) ? "ا" : c);
    const w = (d.words ?? []).find((x) => norm(Array.from(x.text)[0]) === it.id);
    return w ? { emoji: w.emoji } : null;
  };
  let sheets = 0;
  for (const lang of ["en", "ar"]) {
    for (const topic of [...cont.domains.map((d) => d.id), "vocab"]) {
      const acts = activitiesFor(topic, cont);
      assert(acts.length, `${topic} has an activity`);
      for (const activity of acts) {
        const s = buildWorksheet({ topic, activity, content: cont, vocab: voc, state: emptyState(), config: cfg, lang, pictureOf });
        sheets++;
        if (activity === "match") {
          assert(s.pairs.length >= 3, `${topic} match has pairs`);
          assert.deepEqual([...s.order].sort(), s.pairs.map((_, i) => i).sort(), "order is a permutation");
        } else assert(s.rows.length >= 1, `${topic}/${activity} has rows`);
        if (activity === "circle") for (const r of s.rows) {
          assert.equal(r.options.length, 6);
          assert(r.options.includes(r.target) && r.options.filter((o) => o === r.target).length >= 3, "3-4 targets to circle");
        }
        if (activity === "count") for (const r of s.rows) assert(r.n >= 1);
      }
    }
  }
  // the child's hardest items come first
  const en = cont.domains.find((d) => d.id === "en-letters");
  let st = emptyState();
  for (let i = 0; i < 12; i++) st = recordAnswer(st, en, { target: "b", chosen: "b", correct: true, ms: 800 }, cfg);
  const tr = buildWorksheet({ topic: "en-letters", activity: "trace", content: cont, vocab: voc, state: st, config: cfg, lang: "en", pictureOf });
  assert.notEqual(tr.rows[0].id, "b", "a mastered letter is not first");
  console.log("accounts + worksheets ok", sheets, "sheets");
}

// ---- difficulty recovery + insights
{
  const J = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
  const cont = J("content"), cfg = J("config"), lv = J("levels");
  const en = cont.domains.find((d) => d.id === "en-letters");
  const miss = (target) => ({ target, correct: false });
  assert.equal(recoveryTarget([miss("b")]), null, "one miss is not enough");
  assert.equal(recoveryTarget([miss("b"), miss("b")]), "b", "two misses on b");
  assert.equal(recoveryTarget([miss("b"), { target: "a", correct: true }, miss("b")]), "b", "not only back-to-back");
  assert.equal(recoveryTarget([miss("b"), miss("d")]), null, "different letters");
  assert.equal(recoveryTarget([miss("b"), miss("b"), { ...miss("b"), recovery: true }]), null, "no loop after a recovery step");
  assert.equal(recoveryTarget([miss("b"), miss("b"), { target: "b", correct: true, recovery: true }, miss("b")]), null, "only once per item");
  assert.equal(recoveryTarget([miss("b"), miss("b"), { target: "a", correct: true }]), null, "only right after a miss");
  for (let i = 0; i < 30; i++) {
    const q = buildRecoveryQuestion(en, emptyState(), cfg, "b");
    assert.equal(q.type, "sound"); assert.equal(q.choices.length, 2); assert(q.choices.includes("b")); assert(q.recovery);
    const r = buildRecheckQuestion(en, emptyState(), cfg, "b");
    assert.equal(r.target, "b"); assert(r.recheck);
  }

  assert.equal(formatOf("sound"), "hear"); assert.equal(formatOf("trace"), "do"); assert.equal(formatOf("count"), "see");
  const rec = (st, ty, ok, extra = {}) => recordAnswer(st, en, { target: "b", chosen: ok ? "b" : "d", correct: ok, ms: 1000, type: ty, ...extra }, cfg);
  let st = emptyState();
  assert.equal(explain(st, cont, cfg, lv)[0].kind, "few", "no data -> says so");
  for (let i = 0; i < 8; i++) st = rec(st, "sound", true);   // hearing: strong
  for (let i = 0; i < 8; i++) st = rec(st, "trace", i < 3);  // doing: weak
  const fs = formatStats(st);
  assert.equal(fs.hear.acc, 1); assert(fs.do.acc < 0.5);
  const bf = bestFormat(fs);
  assert.equal(bf.best, "hear"); assert.equal(bf.worst, "do");
  assert.equal(bestFormat({ see: { n: 2 }, hear: { n: 9, acc: 1 }, do: { n: 2, acc: 0.1 } }), null, "needs enough answers in two formats");
  assert.equal(bestFormat({ see: { n: 9, acc: .8 }, hear: { n: 9, acc: .85 }, do: { n: 1, acc: 0 } }), null, "no clear gap");
  const kinds = explain(st, cont, cfg, lv).map((o) => o.kind);
  assert(kinds.includes("format") && kinds.includes("confusion"), kinds.join());
  assert(skillProfile(st, cont, cfg).some((b) => b.id === "en-letters"));
  assert(skillProfile(st, cont, cfg).some((b) => b.id === "writing"));
  // recovery counts show up, and recovery answers do not count against the format stats
  let st2 = st;
  for (let i = 0; i < 3; i++) st2 = rec(st2, "sound", false, { rec: 1 });
  st2 = rec(st2, "sound", true, { rec: 2 });
  assert.equal(formatStats(st2).hear.n, fs.hear.n + 1, "recovery steps are excluded, the re-check counts");
  assert(explain(st2, cont, cfg, lv).some((o) => o.kind === "recovery" && o.n === 3 && o.back === 1));
  // trend: improving
  let up = emptyState();
  for (let i = 0; i < 24; i++) up = rec(up, "sound", i >= 10 || i % 3 === 0);
  assert.equal(trend(up).dir, "up");
  assert.equal(trend(emptyState()), null);
  console.log("recovery + insights ok");
}

// ---- letter names and sounds
{
  const J = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
  const cont = J("content");
  const arD = cont.domains.find((d) => d.id === "ar-letters"), enD = cont.domains.find((d) => d.id === "en-letters");
  const harakat = /[\u064B-\u0652]/;
  for (const it of arD.items) {
    assert(harakat.test(it.say), `${it.id}: Arabic letter name carries diacritics so the voice reads it as a letter`);
    assert(it.sound && harakat.test(it.sound), `${it.id}: has a letter sound`);
  }
  assert.equal(arD.items.find((i) => i.id === "ا").say, "أَلِف", "alef is read as a name, not as the number 1000");
  for (const it of enD.items) assert(it.sound, `${it.id} has a sound`);
  // every letter's picture word resolves the same way the cards look it up (أ words belong to ا)
  const norm = (c) => ("أإآ".includes(c) ? "ا" : c);
  for (const d of [arD, enD]) for (const it of d.items) {
    const w = (d.words ?? []).find((x) => norm(Array.from(x.text)[0]) === it.id);
    if (w) assert(w.say && w.text, `${d.id}/${it.id} word has text and say`);
  }
  console.log("letter sounds ok");
}

// 12. Sound Safari + Bloom Break
{
  const { BUILDERS, recordSound, soundSummary } = await import("../lib/sounds.js");
  const { breakDue, pickBreak } = await import("../lib/wellbeing.js");
  const sounds = JSON.parse(readFileSync(new URL("../data/sounds.json", import.meta.url)));
  const wb = JSON.parse(readFileSync(new URL("../data/wellbeing.json", import.meta.url)));
  const harakat = /[\u064B-\u0652]/;
  const hasAr = /[\u0600-\u06FF]/;

  for (const lang of ["en", "ar"]) {
    const pack = sounds[lang];
    const dom = content.domains.find((d) => d.id === pack.domain);
    assert(dom, `${lang}: safari domain exists`);
    // rhyme: every family has 2+ words; a word never sits in two families
    const seen = new Set();
    for (const f of pack.rhyme.families) {
      assert(f.words.length >= 2, `${lang}: rhyme family has 2+ words`);
      for (const w of f.words) { assert(w.text && w.emoji && w.say, `${lang}/${w.text}: complete`); assert(!seen.has(w.text), `${lang}/${w.text}: only in one rhyme family`); seen.add(w.text); }
    }
    // syllables: 1 to 4 beats, and both easy and harder words exist
    const counts = pack.syllables.words.map((w) => w.parts.length);
    assert(counts.every((n) => n >= 1 && n <= 4), `${lang}: 1-4 syllables`);
    assert(new Set(counts).size >= 3, `${lang}: variety of syllable counts`);
    // first sound: letter exists in the app's letter list; no word is in two groups of the same round
    for (const g of pack.firstSound.groups) {
      assert(dom.items.some((i) => i.id === g.letter && i.sound), `${lang}/${g.letter}: letter has a sound in content.json`);
      assert(g.words.length >= 1 && g.words.every((w) => w.emoji && w.say), `${lang}/${g.letter}: words complete`);
      if (lang === "en") for (const w of g.words) assert(w.text[0] === g.letter, `${w.text} starts with ${g.letter}`);
      if (lang === "ar") for (const w of g.words) assert(w.text[0] === g.letter, `${w.text} starts with ${g.letter}`);
    }
    // blend: spoken pieces line up with the written pieces
    for (const w of pack.blend.words) { assert(w.parts.length >= 2 && w.parts.length === w.sayParts.length, `${lang}/${w.text}: blend parts`); }
    // Arabic must carry diacritics so the voice reads it right
    if (lang === "ar") {
      for (const f of pack.rhyme.families) for (const w of f.words) assert(harakat.test(w.say) && hasAr.test(w.text), `ar rhyme ${w.text} says with diacritics`);
      for (const w of pack.syllables.words) assert(harakat.test(w.say) && w.parts.every((p) => harakat.test(p)), `ar syllable ${w.text}`);
      for (const g of pack.firstSound.groups) for (const w of g.words) assert(harakat.test(w.say), `ar hunt ${w.text}`);
      for (const w of pack.blend.words) assert(w.sayParts.every((p) => harakat.test(p)), `ar blend ${w.text}`);
    }

    // rounds: exactly one right answer, no duplicate choices
    const st = emptyState();
    const recent = [];
    for (let i = 0; i < 300; i++) {
      const r1 = BUILDERS.rain(pack, st, { rng, recent });
      assert.equal(r1.choices.length, 3); assert.equal(new Set(r1.choices.map((c) => c.k)).size, 3, "rain: distinct choices");
      const fam = pack.rhyme.families.find((f) => f.words.some((w) => w.text === r1.target.text));
      assert.equal(r1.choices.filter((c) => fam.words.some((w) => w.text === c.k)).length, 1, "rain: exactly one rhyme among the choices");
      assert(fam.words.some((w) => w.text === r1.answer.k) && r1.answer.k !== r1.target.text, "rain: answer rhymes, and is not the word itself");
      const r2 = BUILDERS.hunt(pack, st, { rng, recent });
      assert.equal(r2.choices.filter((c) => c.text[0] === r2.letter).length, 1, "hunt: exactly one choice starts with the sound");
      assert.equal(new Set(r2.choices.map((c) => c.k)).size, 3);
      const r3 = BUILDERS.blend(pack, st, { rng, recent });
      assert(r3.choices.some((c) => c.k === r3.word.text) && new Set(r3.choices.map((c) => c.k)).size === 3, "blend: answer present once");
      const r4 = BUILDERS.drums(pack, st, { rng, recent });
      assert.equal(r4.n, r4.word.parts.length);
    }
  }

  // words the child struggles with come back more often than ones they know
  {
    const pack = sounds.en;
    let s = emptyState();
    for (let i = 0; i < 4; i++) s = recordSound(s, "drums", "banana", false, config);
    for (let i = 0; i < 6; i++) s = recordSound(s, "drums", "cat", true, config);
    let banana = 0, cat = 0;
    for (let i = 0; i < 600; i++) { const r = BUILDERS.drums(pack, s, { rng }); if (r.key === "banana") banana++; if (r.key === "cat") cat++; }
    assert(banana > cat * 2, `weak word returns more often (${banana} vs ${cat})`);
  }

  // stars and tallies
  {
    let s = emptyState();
    s = recordSound(s, "rain", "cat", true, config);
    s = recordSound(s, "rain", "dog", false, config);
    assert.equal(s.stars, config.safari.starsFirstTry + config.safari.starsRetry);
    const sum = soundSummary(s, ["rain", "drums"]);
    assert.equal(sum[0].right, 1); assert.equal(sum[0].wrong, 1); assert.deepEqual(sum[0].hard, ["dog"]); assert.equal(sum[1].total, 0);
  }

  // Bloom Break: offered after a long stretch or 3 misses in a row, never right after the last break
  {
    const cfg = config.wellbeing, t0 = 1_000_000;
    assert.equal(breakDue({ now: t0 + 1000, sessionStart: t0, recent: [true, true], cfg }), null, "fresh session: no break");
    assert.equal(breakDue({ now: t0 + cfg.breakAfterMs, sessionStart: t0, recent: [true], cfg }), "time");
    assert.equal(breakDue({ now: t0 + cfg.minGapMs + 1, sessionStart: t0, recent: [true, false, false, false], cfg }), "misses");
    assert.equal(breakDue({ now: t0 + 5000, sessionStart: t0, lastBreak: t0 + 4000, recent: [false, false, false], cfg }), null, "no second break straight away");
    assert.equal(breakDue({ now: t0 + cfg.minGapMs + 1, sessionStart: t0, recent: [false, false, true], cfg }), null, "a right answer breaks the streak");
    const ids = new Set(); for (let i = 0; i < 40; i++) ids.add(pickBreak(wb.breaks, { avoid: "frog", rng }).id);
    assert(!ids.has("frog") && ids.size > 2, "pickBreak avoids the last break and varies");
    both(wb, "wellbeing");
    assert(wb.breaks.every((b) => b.emoji && (b.kind === "move" || b.kind === "breathe")), "breaks complete");
  }
  console.log("sound safari + bloom break ok");
}

// 13. Quick Look Owl + My Superpower
{
  const Q = await import("../lib/quantity.js");
  const { superPower, braveTries, knownAndGrowing, buildSuperpower } = await import("../lib/superpower.js");
  const owlData = JSON.parse(readFileSync(new URL("../data/owl.json", import.meta.url)));
  const oc = config.owl;
  const numbersD = content.domains.find((d) => d.id === "numbers");

  // every number the games can say has a spoken form in both languages
  for (let n = 1; n <= 10; n++) {
    const it = numbersD.items.find((i) => i.id === String(n));
    assert(it && it.say.en && it.say.ar, `number ${n} has say in en and ar`);
  }
  assert.equal(Q.numLabel(10, "ar"), "١٠"); assert.equal(Q.numLabel(7, "en"), "7");

  // layouts: right number of dots, inside the box, never overlapping
  for (let n = 1; n <= 6; n++) assert.equal(Q.diceLayout(n).length, n);
  for (let n = 1; n <= 10; n++) assert.equal(Q.tenFrameLayout(n).length, n);
  const dist = (pts) => { let m = Infinity; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) m = Math.min(m, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])); return m; };
  for (let n = 1; n <= 12; n++) for (let k = 0; k < 60; k++) {
    const pts = Q.scatterLayout(n, rng);
    assert.equal(pts.length, n);
    assert(pts.every(([x, y]) => x >= 5 && x <= 95 && y >= 5 && y <= 95), `scatter ${n}: inside the box`);
    if (n > 1) assert(dist(pts) >= 14, `scatter ${n}: dots stay apart (${dist(pts).toFixed(1)})`);
  }
  for (const n of [1, 5, 8, 10, 12]) assert.equal(Q.rowsLayout(n).length, n);

  // look: levels widen the range, answers are present once, choices are real numbers
  let st = emptyState();
  assert.equal(Q.lookMax(st, oc), 3);
  for (let i = 0; i < oc.rightsPerLevel; i++) st = Q.recordNumber(st, "look", "2", true, oc);
  assert.equal(Q.lookMax(st, oc), 5, "5 first-try rights opens 4 and 5");
  for (let i = 0; i < oc.rightsPerLevel * 10; i++) st = Q.recordNumber(st, "look", "2", true, oc);
  assert.equal(Q.lookMax(st, oc), oc.maxLook, "range is capped");
  assert(Q.flashFor(st, oc) <= Q.flashFor(emptyState(), oc), "flash gets shorter as the child improves, never longer");
  for (const s0 of [emptyState(), st]) for (let i = 0; i < 300; i++) {
    const r = Q.buildLookRound(s0, oc, { rng });
    assert(r.n >= 1 && r.n <= Q.lookMax(s0, oc));
    assert.equal(r.layout.pts.length, r.n, "dots match the number");
    assert.equal(r.choices.filter((c) => c === r.n).length, 1, "answer appears once");
    assert.equal(new Set(r.choices).size, r.choices.length, "no duplicate choices");
    assert(r.choices.length >= 3 && r.choices.every((c) => c >= 1 && c <= 10));
    if (r.layout.kind === "dice") assert(r.n <= 6);
  }

  // number line: tolerance is a fraction of the line, hints point the right way
  const lr = Q.buildLineRound(emptyState(), oc, { rng });
  assert.equal(lr.max, 5, "starts on a 0-5 line");
  assert(lr.n >= 1 && lr.n < lr.max);
  const exact = Q.scoreLine({ n: 3, max: 10 }, 0.3, oc); assert(exact.ok);
  assert(Q.scoreLine({ n: 3, max: 10 }, 0.38, oc).ok, "within tolerance");
  const farRight = Q.scoreLine({ n: 3, max: 10 }, 0.7, oc); assert(!farRight.ok && !farRight.close && farRight.dir === "smaller");
  const nearLeft = Q.scoreLine({ n: 7, max: 10 }, 0.55, oc); assert(!nearLeft.ok && nearLeft.close && nearLeft.dir === "bigger");
  let st2 = emptyState();
  for (let i = 0; i < oc.rightsPerLevel; i++) st2 = Q.recordNumber(st2, "line", "1/5", true, oc);
  assert.equal(Q.buildLineRound(st2, oc, { rng }).max, 10, "moves to a 0-10 line after enough successes");

  // bigger tribe: one clear winner, ratio tightens with level, counts stay small
  for (let lvl = 0; lvl < oc.moreRatios.length; lvl++) {
    let s3 = emptyState();
    for (let i = 0; i < oc.moreRightsPerLevel * lvl; i++) s3 = Q.recordNumber(s3, "more", `lvl${Math.max(0, lvl - 1)}`, true, oc);
    for (let i = 0; i < 200; i++) {
      const r = Q.buildMoreRound(s3, oc, { rng, emoji: owlData.emoji });
      const [a, b] = r.groups.map((g) => g.count);
      assert(a !== b, "never a tie");
      assert.equal(r.groups[r.answer].count, Math.max(a, b), "answer is the bigger group");
      assert(Math.max(a, b) <= oc.moreMaxCount && Math.min(a, b) >= 2);
      assert(r.groups.every((g) => g.pts.length === g.count && g.rows.length === g.count));
      assert.equal(r.level, lvl);
    }
  }

  // struggling numbers come back more often
  {
    let s4 = emptyState();
    for (let i = 0; i < 4; i++) s4 = Q.recordNumber(s4, "look", "3", false, oc);
    for (let i = 0; i < 6; i++) s4 = Q.recordNumber(s4, "look", "1", true, oc);
    let threes = 0, ones = 0;
    for (let i = 0; i < 600; i++) { const r = Q.buildLookRound(s4, oc, { rng }); if (r.n === 3) threes++; if (r.n === 1) ones++; }
    assert(threes > ones * 1.5, `weak number returns more often (${threes} vs ${ones})`);
    const sum = Q.numberSummary(s4, ["look", "line"]);
    assert.equal(sum[0].wrong, 4); assert.deepEqual(sum[0].hard, ["3"]); assert.equal(sum[1].total, 0);
  }

  // My Superpower: strengths first, never claims a power without evidence
  {
    const mk = (see, hear, doo) => {
      const log = [];
      const add = (ty, ok, n) => { for (let i = 0; i < n; i++) log.push({ t: i, d: "en-letters", target: "a", ok: i < ok, ms: 1000, ty }); };
      add("missing", see[0], see[1]); add("sound", hear[0], hear[1]); add("trace", doo[0], doo[1]);
      return { ...emptyState(), log };
    };
    assert.equal(superPower(emptyState()).power, null, "no data: still exploring");
    assert.equal(superPower(mk([9, 10], [4, 10], [5, 10])).power, "see");
    assert.equal(superPower(mk([4, 10], [9, 10], [5, 10])).power, "hear");
    assert.equal(superPower(mk([4, 10], [5, 10], [9, 10])).power, "do");
    assert.equal(superPower(mk([8, 10], [8, 10], [9, 10])).power, "all", "good everywhere: all-rounder");
    assert.equal(superPower(mk([2, 10], [2, 10], [3, 10])).power, null, "low across the board: never labelled, just keep exploring");
    assert.equal(superPower(mk([3, 10], [2, 4], [1, 4])).power, null, "too little evidence per format");

    let s5 = emptyState();
    for (let i = 0; i < 8; i++) s5 = recordAnswer(s5, en, { target: "a", chosen: "a", correct: true, ms: 800, type: "sound" }, config);
    for (let i = 0; i < 5; i++) s5 = recordAnswer(s5, en, { target: "b", chosen: "d", correct: false, ms: 800, type: "sound" }, config);
    const kg = knownAndGrowing(s5, content, config);
    assert(kg.know.some((r) => r.itemId === "a"), "a well-known letter shows under 'things I know'");
    assert(kg.growing.some((r) => r.itemId === "b") && !kg.know.some((r) => r.itemId === "b"), "a shaky one shows under 'growing', not 'know'");
    s5 = Q.recordNumber(s5, "look", "4", false, oc);
    s5.log.push({ t: 1, d: "en-letters", target: "a", ok: true, ms: 1, ty: "sound", rec: 2 });
    assert.equal(braveTries(s5), 2, "a re-check win plus an owl round that took a second go");
    const full = buildSuperpower(s5, content, config);
    assert(["know", "growing", "brave", "power"].every((k) => k in full));
  }

  // bilingual text for new screens is covered by the strings parity check; games data
  assert(owlData.games.every((g) => g.id && g.icon && g.color) && owlData.emoji.length >= 6);
  console.log("quick look owl + superpower ok");
}
