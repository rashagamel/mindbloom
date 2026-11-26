"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { content, strings, config, levels, rewards } from "@/lib/content";
import { resolveText, findMissions, levelProgress, earnedBadges, liveStreak } from "@/lib/engine";
import { findByName } from "@/lib/accounts";
import { Mascot } from "@/components/Visuals";
import WorldArt from "@/components/WorldArt";

const AVATARS = ["🦁", "🐰", "🐱", "🐼", "🦊", "🐸", "🐯", "🦄"];

function Setup() {
  const { setState, lang, setLang, signIn, roster } = useApp();
  const langs = Object.keys(strings);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const s = strings[lang];

  const found = findByName(roster(), name);

  const submit = (e) => {
    e.preventDefault();
    if (found && signIn(name)) return;
    setState((prev) => ({ ...prev, child: { name: name.trim() || "🙂", lang, avatar, createdAt: Date.now() } }));
  };

  return (
    <form className="card" onSubmit={submit} dir={s.dir}>
      <h1>{s.appName}</h1>
      <p className="muted">{s.tagline}</p>
      <label htmlFor="lang">{s.language}</label>
      <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
        {langs.map((l) => (
          <option key={l} value={l}>{strings[l].languageName}</option>
        ))}
      </select>
      <label htmlFor="name">{s.yourName}</label>
      <input id="name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      <p className="muted" aria-live="polite">{found ? "✅ " + s.welcomeBack.replace("{name}", found.state.child.name) : s.signInHint}</p>
      {!found && <label>{s.chooseAvatar}</label>}
      <div className="avatars" role="radiogroup" hidden={!!found}>
        {AVATARS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={a === avatar} className={`avatar ${a === avatar ? "on" : ""}`} onClick={() => setAvatar(a)}>{a}</button>
        ))}
      </div>
      <div className="actions">
        <button className="btn" type="submit">{found ? s.continueAs.replace("{name}", found.state.child.name) : s.start}</button>
      </div>
      <p className="muted">{s.privacy}</p>
    </form>
  );
}

export default function Home() {
  const { state, setState, ready, lang, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <Setup />;

  const missions = findMissions(state, content, config);
  const top = missions[0];
  const topDomain = top && content.domains.find((d) => d.id === top.domainId);
  const streak = liveStreak(state);
  const newBadges = earnedBadges(state, rewards).filter((id) => !state.badgesSeen.includes(id)).length;
  const sound = state.child.sound !== false;
  const toggleSound = () => setState((s) => ({ ...s, child: { ...s.child, sound: !sound } }));
  const focus = !!state.child.focus;
  const toggleFocus = () => setState((s) => ({ ...s, child: { ...s.child, focus: !focus } }));

  return (
    <>
      <div className="topbar">
        <span className="stars">⭐ {state.stars}</span>
        <span className="topbtns">
          <button className="link" onClick={toggleSound}>{sound ? "🔊" : "🔇"} {t(sound ? "soundOn" : "soundOff")}</button>
          <button className="link" onClick={toggleFocus} aria-pressed={focus} title={t("focusHint")}>🎯 {t(focus ? "focusOn" : "focusOff")}</button>
          <Link className="link" href="/about">💡 {t("about")}</Link>
          <Link className="link" href="/parent">{t("parents")}</Link>
        </span>
      </div>
      <div className="hero">
        <Mascot mood="cheer" size={110} />
        <div>
          <h1>{t("hello", { name: state.child.name })}</h1>
          <p className="muted">{t("pickGame")}</p>
        </div>
      </div>

      <div className="chips">
        <Link className="chip link" href="/profiles">{state.child.avatar ?? "🙂"} {state.child.name} <span className="muted">⇄ {t("switchChild")}</span></Link>
        <span className="chip">🔥 {streak ? t("streakDays", { n: streak }) : t("noStreak")}</span>
        <Link className="chip link" href="/superpower">🦸 {t("superChip")}</Link>
        <Link className="chip link" href="/rewards">🏆 {t("rewards")}{newBadges ? <b className="newdot">{t("newBadges", { n: newBadges })}</b> : null}</Link>
      </div>

      {state.assessments.length === 0 && !state.child.starterSkipped && (
        <div className="card mission">
          <div className="missionicon">🌟</div>
          <div>
            <b>{t("starterTitle")}</b>
            <p>{t("starterBody")}</p>
            <Link className="btn small" href="/start">{t("starterGo")}</Link>
          </div>
        </div>
      )}

      {top && (
        <div className="card mission">
          <div className="missionicon">🕵️</div>
          <div>
            <b>{t("mission")}</b>
            <p>{t("missionBody", { a: top.ids[0], b: top.ids[1] })}</p>
            <Link className="btn small" href={`/twins/${top.domainId}/${top.groupIndex}`}>{t("missionGo")}</Link>
          </div>
        </div>
      )}

      <h2>{t("worlds")}</h2>
      <div className="grid">
        {levels.worlds.map((w) => {
          const d = content.domains.find((x) => x.id === w.domain);
          const n = w.levels.filter((l) => levelProgress(state, w.domain, l.id).stars >= 1).length;
          return (
            <Link key={w.domain} href={`/world/${w.domain}`} className="card domain world" style={{ background: `linear-gradient(${w.from}, ${w.to})` }}>
              <WorldArt art={w.art} height={70} />
              <span>{w.icon} {resolveText(d.title, lang)}</span>
              <span className="muted">{t("levelsDone", { n, m: w.levels.length })}</span>
              <span className="bar"><span style={{ width: `${(n / w.levels.length) * 100}%` }} /></span>
            </Link>
          );
        })}
      </div>

      <Link href="/safari" className="card mission safaribanner">
        <div className="missionicon">🦜</div>
        <div>
          <b>{t("safariTitle")}</b>
          <p>{t("safariIntro")}</p>
        </div>
      </Link>

      <Link href="/owl" className="card mission owlbanner">
        <div className="missionicon">🦉</div>
        <div>
          <b>{t("owlTitle")}</b>
          <p>{t("owlIntro")}</p>
        </div>
      </Link>

      <h2>{t("freePractice")}</h2>
      <div className="grid">
        {content.domains.map((d) => (
          <div key={d.id} className="card domain">
            <Link href={`/play/${d.id}`} className="tile">
              <span className="icon">{d.icon}</span>
              <span>{resolveText(d.title, lang)}</span>
            </Link>
            <div className="minibtns">
              <Link className="btn secondary small" href={`/monster/${d.id}`}>🐲 {t("monster")}</Link>
              {d.memory && <Link className="btn secondary small" href={`/memory/${d.id}`}>🃏 {t("memory")}</Link>}
              <Link className="btn secondary small" href={`/check/${d.id}`}>🩺 {t("checkup")}</Link>
            </div>
          </div>
        ))}
        <Link href="/library" className="card domain tile">
          <span className="icon">📚</span>
          <span>{t("library")}</span>
        </Link>
        <Link href="/match" className="card domain tile">
          <span className="icon">🧩</span>
          <span>{t("match")}</span>
        </Link>
        <Link href="/lab" className="card domain tile">
          <span className="icon">🔬</span>
          <span>{t("lab")}</span>
        </Link>
        <Link href="/worksheets" className="card domain tile">
          <span className="icon">🖨️</span>
          <span>{t("worksheets")}</span>
        </Link>
        <Link href="/garden" className="card domain tile">
          <span className="icon">🌻</span>
          <span>{t("garden")}</span>
        </Link>
      </div>
    </>
  );
}
