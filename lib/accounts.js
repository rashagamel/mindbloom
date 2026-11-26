// "Sign in" by name, and moving progress between devices. No server: the name is just
// the key to a profile stored in this browser, and the backup file carries it elsewhere.

// Same name whatever the case, spaces, or alef/yaa/taa-marbuta spelling.
export const normName = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْ]/g, "");

export const findByName = (rows, name) => {
  const n = normName(name);
  if (!n) return null;
  return rows.find((r) => r.state?.child && normName(r.state.child.name) === n) ?? null;
};

const weight = (s) => (s?.stars ?? 0) * 1000 + Object.keys(s?.items ?? {}).length + (s?.assessments?.length ?? 0) * 10;
// When the same child exists on both sides, keep the one with more progress.
export const pickMore = (a, b) => (weight(b) >= weight(a) ? b : a);

export const makeBackup = (rows) => ({
  app: "mindbloom",
  version: 1,
  exportedAt: new Date().toISOString(),
  profiles: rows.filter((r) => r.state?.child).map((r) => ({ id: r.id, state: r.state })),
});

// Accepts a backup file, the "all children" JSON, or one child's progress file.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "notJson", entries: [] };
  }
  let list = [];
  if (data?.app === "mindbloom" && Array.isArray(data.profiles)) list = data.profiles.map((p) => p.state);
  else if (Array.isArray(data)) list = data.map(({ id, ...state }) => state);
  else if (data && typeof data === "object" && data.child) list = [data];
  const entries = list.filter((s) => s && typeof s === "object" && s.child && typeof s.child.name === "string");
  return entries.length ? { entries } : { error: "empty", entries: [] };
}
