// Sound Safari engine. Pure functions (no browser APIs) so they can be unit tested.
// A "pack" is data/sounds.json[lang]: rhyme families, syllable words, first-sound groups, blend words.
// Words the child gets wrong come back more often; words they know come back less.

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const statOf = (state, game, key) => state.sounds?.[game]?.[key] ?? { right: 0, wrong: 0 };
const weightOf = (state, game, key) => {
  const s = statOf(state, game, key);
  return Math.max(0.3, 1 + 2 * s.wrong - 0.5 * s.right);
};

function pickWeighted(list, weight, rng) {
  const total = list.reduce((sum, x) => sum + weight(x), 0);
  let r = rng() * total;
  for (const x of list) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

const fresh = (list, key, recent) => {
  const f = list.filter((x) => !recent.includes(key(x)));
  return f.length ? f : list;
};

const asChoice = (w) => ({ ...w, k: w.text });

// Which of these words rhymes with the one in the cloud?
export function buildRhymeRound(pack, state, { rng = Math.random, recent = [] } = {}) {
  const fams = pack.rhyme.families;
  const all = fams.flatMap((f, fi) => f.words.map((w) => ({ w, fi })));
  const t = pickWeighted(fresh(all, (x) => x.w.text, recent), (x) => weightOf(state, "rain", x.w.text), rng);
  const mates = fams[t.fi].words.filter((w) => w.text !== t.w.text);
  const answer = mates[Math.floor(rng() * mates.length)];
  // one distractor from each of two OTHER families, so exactly one choice rhymes
  const otherFams = shuffle(fams.map((_, i) => i).filter((i) => i !== t.fi), rng).slice(0, 2);
  const distractors = otherFams.map((fi) => fams[fi].words[Math.floor(rng() * fams[fi].words.length)]);
  return {
    game: "rain",
    key: t.w.text,
    target: t.w,
    answer: asChoice(answer),
    choices: shuffle([answer, ...distractors].map(asChoice), rng),
  };
}

// How many beats (syllables) are in this word?
export function buildSyllableRound(pack, state, { rng = Math.random, recent = [] } = {}) {
  const words = pack.syllables.words;
  const w = pickWeighted(fresh(words, (x) => x.text, recent), (x) => weightOf(state, "drums", x.text), rng);
  return { game: "drums", key: w.text, word: w, n: w.parts.length };
}

// Which picture starts with this sound?
export function buildFirstSoundRound(pack, state, { rng = Math.random, recent = [] } = {}) {
  const groups = pack.firstSound.groups;
  const g = pickWeighted(fresh(groups, (x) => x.letter, recent), (x) => weightOf(state, "hunt", x.letter), rng);
  const answer = g.words[Math.floor(rng() * g.words.length)];
  const others = shuffle(groups.filter((x) => x.letter !== g.letter), rng).slice(0, 2);
  const distractors = others.map((x) => x.words[Math.floor(rng() * x.words.length)]);
  return {
    game: "hunt",
    key: g.letter,
    letter: g.letter,
    answer: asChoice(answer),
    choices: shuffle([answer, ...distractors].map(asChoice), rng),
  };
}

// The robot says the pieces; the child picks the word they make.
export function buildBlendRound(pack, state, { rng = Math.random, recent = [] } = {}) {
  const words = pack.blend.words;
  const w = pickWeighted(fresh(words, (x) => x.text, recent), (x) => weightOf(state, "blend", x.text), rng);
  const distractors = shuffle(words.filter((x) => x.text !== w.text), rng).slice(0, 2);
  return {
    game: "blend",
    key: w.text,
    word: w,
    answer: asChoice(w),
    choices: shuffle([w, ...distractors].map(asChoice), rng),
  };
}

export const BUILDERS = {
  rain: buildRhymeRound,
  drums: buildSyllableRound,
  hunt: buildFirstSoundRound,
  blend: buildBlendRound,
};

// Log one finished round. `firstTry` = the child got it without needing real help.
export function recordSound(state, game, key, firstTry, config) {
  const prev = statOf(state, game, key);
  const next = { right: prev.right + (firstTry ? 1 : 0), wrong: prev.wrong + (firstTry ? 0 : 1) };
  const stars = state.stars + (firstTry ? config.safari.starsFirstTry : config.safari.starsRetry);
  return { ...state, stars, sounds: { ...state.sounds, [game]: { ...state.sounds?.[game], [key]: next } } };
}

// Totals per game plus the words that needed the most help (for the parent page).
export function soundSummary(state, games) {
  return games.map((id) => {
    const rows = Object.entries(state.sounds?.[id] ?? {});
    const right = rows.reduce((s, [, v]) => s + v.right, 0);
    const wrong = rows.reduce((s, [, v]) => s + v.wrong, 0);
    const hard = rows.filter(([, v]) => v.wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 3).map(([k]) => k);
    return { id, right, wrong, total: right + wrong, hard };
  });
}
