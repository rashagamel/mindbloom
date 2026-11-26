"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { levels } from "@/lib/content";
import { findByName, makeBackup, parseBackup } from "@/lib/accounts";
import { levelProgress } from "@/lib/engine";

export default function Profiles() {
  const { ready, activeId, switchProfile, addProfile, roster, importProfiles, signIn, t } = useApp();
  const router = useRouter();
  const [list, setList] = useState([]);
  const [who, setWho] = useState("");
  const [msg, setMsg] = useState("");
  const refresh = () => setList(roster().filter((p) => p.state.child));
  useEffect(() => { if (ready) refresh(); }, [ready, roster]);
  if (!ready) return null;

  const cleared = (s) => levels.worlds.reduce((n, w) => n + w.levels.filter((l) => levelProgress(s, w.domain, l.id).stars >= 1).length, 0);
  const pick = (id) => { switchProfile(id); router.push("/"); };
  const add = () => { addProfile(); router.push("/"); };
  const enter = (e) => {
    e.preventDefault();
    if (signIn(who)) router.push("/");
    else setMsg(t("signInHint"));
  };
  const save = () => {
    const blob = new Blob([JSON.stringify(makeBackup(roster()), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mindbloom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const load = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = parseBackup(await file.text());
    if (r.error) return setMsg(t("importFail"));
    const out = importProfiles(r.entries);
    setMsg(t("importDone", out));
    refresh();
  };

  return (
    <>
      <div className="topbar"><span /><strong>{t("whoPlays")}</strong><span /></div>
      <div className="grid">
        {list.map(({ id, state }) => (
          <button key={id} className={`card domain profilecard ${id === activeId ? "active" : ""}`} onClick={() => pick(id)}>
            <span className="icon">{state.child.avatar ?? "🙂"}</span>
            <b>{state.child.name}</b>
            <span className="muted">⭐ {state.stars} · 🗺️ {cleared(state)}</span>
            {id === activeId && <span className="pill">{t("activeNow")}</span>}
          </button>
        ))}
        <button className="card domain profilecard add" onClick={add}>
          <span className="icon">➕</span>
          <b>{t("addChild")}</b>
        </button>
      </div>

      <form className="card" onSubmit={enter}>
        <label htmlFor="who">{t("yourName")}</label>
        <input id="who" value={who} maxLength={20} onChange={(e) => { setWho(e.target.value); setMsg(""); }} autoComplete="off" />
        <div className="actions">
          <button className="btn" type="submit" disabled={!findByName(list, who)}>{t("continueAs", { name: findByName(list, who)?.state.child.name ?? "…" })}</button>
        </div>
        <p className="muted">{t("signInHint")}</p>
      </form>

      <div className="card">
        <p className="muted">{t("backupNote")}</p>
        <div className="actions">
          <button className="btn secondary small" onClick={save}>⬇ {t("saveBackup")}</button>
          <label className="btn secondary small" style={{ cursor: "pointer" }}>
            ⬆ {t("loadBackup")}
            <input type="file" accept="application/json,.json" onChange={load} hidden />
          </label>
        </div>
        {msg && <p role="status">{msg}</p>}
      </div>
    </>
  );
}
