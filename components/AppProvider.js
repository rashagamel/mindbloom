"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { config, strings } from "@/lib/content";
import { emptyState } from "@/lib/engine";
import { findByName, pickMore } from "@/lib/accounts";
import { deleteProfile, loadIndex, loadProfile, newProfileId, roster as readRoster, saveIndex, saveProfile } from "@/lib/storage";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function AppProvider({ children }) {
  const [state, setStateRaw] = useState(emptyState());
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState("en");

  const [index, setIndex] = useState({ active: "p1", ids: ["p1"] });
  const activeRef = useRef("p1");
  const key = config.storageKey;

  useEffect(() => {
    const idx = loadIndex(key);
    activeRef.current = idx.active;
    setIndex(idx);
    setStateRaw(loadProfile(key, idx.active));
    setReady(true);
  }, [key]);

  // Always saves to whoever is playing right now.
  const setState = useCallback((next) => {
    setStateRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      saveProfile(key, activeRef.current, value);
      return value;
    });
  }, [key]);

  const switchProfile = useCallback((id) => {
    activeRef.current = id;
    setIndex((i) => {
      const idx = { ...i, active: id };
      saveIndex(key, idx);
      return idx;
    });
    setStateRaw(loadProfile(key, id));
  }, [key]);

  const addProfile = useCallback(() => {
    const id = newProfileId();
    saveProfile(key, id, emptyState());
    activeRef.current = id;
    setIndex((i) => {
      const idx = { active: id, ids: [...i.ids, id] };
      saveIndex(key, idx);
      return idx;
    });
    setStateRaw(emptyState());
  }, [key]);

  const removeProfile = useCallback((id) => {
    deleteProfile(key, id);
    setIndex((i) => {
      let ids = i.ids.filter((x) => x !== id);
      if (!ids.length) {
        const fresh = newProfileId();
        saveProfile(key, fresh, emptyState());
        ids = [fresh];
      }
      const active = id === i.active ? ids[0] : i.active;
      const idx = { active, ids };
      saveIndex(key, idx);
      if (active !== i.active) {
        activeRef.current = active;
        setStateRaw(loadProfile(key, active));
      }
      return idx;
    });
  }, [key]);

  const roster = useCallback(() => readRoster(key), [key]);

  const lang = state.child ? (strings[state.child.lang] ? state.child.lang : "en") : preview;
  // Works before and after sign-up: the choice is kept on the child once there is one.
  const setLang = useCallback((l) => {
    if (!strings[l]) return;
    setPreview(l);
    setState((s) => (s.child ? { ...s, child: { ...s.child, lang: l } } : s));
  }, [setState]);

  // Focus mode: hides the animated background and stops decorative motion (see globals.css).
  useEffect(() => {
    document.documentElement.dataset.focus = state.child?.focus ? "1" : "0";
  }, [state.child?.focus]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = strings[lang].dir;
  }, [lang]);

  const t = useCallback(
    (key, vars = {}) => {
      const raw = strings[lang][key] ?? strings.en[key] ?? key;
      if (Array.isArray(raw)) return raw;
      return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), raw);
    },
    [lang]
  );

  // Continue as an existing child by typing the same name. Drops an empty, unnamed profile.
  const signIn = useCallback((name) => {
    const m = findByName(readRoster(key), name);
    if (!m) return false;
    const cur = activeRef.current;
    if (cur === m.id) return true;
    const empty = !loadProfile(key, cur).child;
    switchProfile(m.id);
    if (empty) removeProfile(cur);
    return true;
  }, [key, switchProfile, removeProfile]);

  // Bring children in from a backup file. Same name -> keep whichever has more progress.
  const importProfiles = useCallback((states) => {
    const rows = readRoster(key);
    let added = 0, updated = 0;
    const ids = [...index.ids];
    for (const s of states) {
      const m = findByName(rows, s.child.name);
      if (m) {
        const best = pickMore(m.state, { ...emptyState(), ...s });
        saveProfile(key, m.id, best);
        if (best !== m.state && m.id === activeRef.current) setStateRaw(best);
        updated++;
      } else {
        const id = newProfileId();
        saveProfile(key, id, { ...emptyState(), ...s });
        rows.push({ id, state: s });
        ids.push(id);
        added++;
      }
    }
    const idx = { active: activeRef.current, ids };
    saveIndex(key, idx);
    setIndex(idx);
    return { added, updated };
  }, [key, index.ids]);

  return <Ctx.Provider value={{ state, setState, ready, lang, setLang, t, signIn, importProfiles, activeId: index.active, profileCount: index.ids.length, switchProfile, addProfile, removeProfile, roster }}>{children}</Ctx.Provider>;
}
