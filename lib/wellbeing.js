// Bloom Break logic. A break is only OFFERED between questions, never in the middle of one,
// and the adult or child can always skip it. Numbers live in data/config.json ("wellbeing").

// Why a break is due right now: "time" (worked a while), "misses" (several wrong in a row), or null.
export function breakDue({ now, sessionStart, lastBreak = 0, recent = [], cfg }) {
  const since = now - Math.max(sessionStart, lastBreak);
  if (since >= cfg.breakAfterMs) return "time";
  const n = cfg.missesInRow;
  const tail = recent.slice(-n);
  if (tail.length === n && tail.every((x) => x === false) && now - lastBreak >= cfg.minGapMs) return "misses";
  return null;
}

// A random break that isn't the one just used.
export function pickBreak(breaks, { avoid = null, rng = Math.random } = {}) {
  const pool = breaks.filter((b) => b.id !== avoid);
  const list = pool.length ? pool : breaks;
  return list[Math.floor(rng() * list.length)];
}
