"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Mascot } from "@/components/Visuals";
import { rewards } from "@/lib/content";
import { earnedBadges, liveStreak, resolveText } from "@/lib/engine";

export default function Rewards() {
  const { state, setState, ready, lang, t } = useApp();
  const earned = ready && state.child ? earnedBadges(state, rewards) : [];
  // Opening the trophy room marks every earned badge as seen.
  useEffect(() => {
    if (earned.some((id) => !state.badgesSeen.includes(id))) setState((s) => ({ ...s, badgesSeen: [...new Set([...s.badgesSeen, ...earned])] }));
  }, [earned.join(), ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const streak = liveStreak(state);
  const wear = (id) => setState((s) => ({ ...s, child: { ...s.child, hat: id } }));

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🏆 {t("trophy")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>

      <div className="card streakcard">
        <div className="flame">🔥</div>
        <div>
          <b>{streak ? t("streakDays", { n: streak }) : t("noStreak")}</b>
          <p className="muted">{t("bestStreak")}: {state.streak?.best ?? 0}</p>
        </div>
      </div>

      <div className="card center">
        <Mascot mood="cheer" size={120} />
        <h2>{t("hats")}</h2>
        <div className="hats">
          {rewards.hats.map((h) => {
            const open = state.stars >= h.stars;
            const on = (state.child.hat ?? "none") === h.id;
            return (
              <button key={h.id} className={`hat ${on ? "on" : ""} ${open ? "" : "off"}`} disabled={!open} onClick={() => wear(h.id)}>
                <span className="hatemoji">{open ? h.emoji || "🚫" : "🔒"}</span>
                <small>{resolveText(h.title, lang)}</small>
                <small>{open ? (on ? t("wearing") : t("wear")) : t("hatNeeds", { n: h.stars })}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>{t("badges")} ({earned.length}/{rewards.badges.length})</h2>
        <div className="badges">
          {rewards.badges.map((b) => {
            const has = earned.includes(b.id);
            return (
              <div key={b.id} className={`badge ${has ? "" : "off"}`}>
                <div className="badgeicon">{has ? b.icon : "🔒"}</div>
                <b>{resolveText(b.title, lang)}</b>
                <small>{resolveText(b.desc, lang)}</small>
              </div>
            );
          })}
        </div>
        <p><Link className="btn secondary small" href="/garden">🌻 {t("garden")}</Link></p>
      </div>
    </>
  );
}
