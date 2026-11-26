// Progress lives only in this browser (localStorage). No server, no accounts.
// One saved state per child ("profile"), plus a small index that says who is playing.
import { emptyState } from "./engine.js";

const read = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app keeps working for this visit */
  }
};

const profileKey = (prefix, id) => `${prefix}.p.${id}`;
const indexKey = (prefix) => `${prefix}.index`;
export const newProfileId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const loadProfile = (prefix, id) => ({ ...emptyState(), ...(read(profileKey(prefix, id)) ?? {}) });
export const saveProfile = (prefix, id, state) => write(profileKey(prefix, id), state);
export const saveIndex = (prefix, idx) => write(indexKey(prefix), idx);

export function deleteProfile(prefix, id) {
  try {
    window.localStorage.removeItem(profileKey(prefix, id));
  } catch {
    /* ignore */
  }
}

// First run, or data saved by the one-child version: wrap it as profile "p1".
export function loadIndex(prefix) {
  const idx = read(indexKey(prefix));
  if (idx && Array.isArray(idx.ids) && idx.ids.length) return idx;
  const old = read(prefix);
  if (old) saveProfile(prefix, "p1", { ...emptyState(), ...old });
  const fresh = { active: "p1", ids: ["p1"] };
  saveIndex(prefix, fresh);
  return fresh;
}

export const roster = (prefix) => loadIndex(prefix).ids.map((id) => ({ id, state: loadProfile(prefix, id) }));
