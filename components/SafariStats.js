"use client";
import { useApp } from "./AppProvider";
import { sounds } from "@/lib/content";
import { soundSummary } from "@/lib/sounds";

const NAME = { rain: "safariRain", drums: "safariDrums", hunt: "safariHunt", blend: "safariBlend" };

// Parent view of Sound Safari: how each game is going and which words needed the most help.
export default function SafariStats() {
  const { state, t } = useApp();
  const rows = soundSummary(state, sounds.games.map((g) => g.id));
  const any = rows.some((r) => r.total > 0);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>🦜 {t("safariStats")}</h2>
      {!any && <p className="muted">{t("safariStatsEmpty")}</p>}
      {rows.filter((r) => r.total > 0).map((r) => (
        <div key={r.id} style={{ marginBottom: 10 }}>
          <b>{sounds.games.find((g) => g.id === r.id).icon} {t(NAME[r.id])}</b>
          <div className="bar"><span style={{ width: `${(r.right / r.total) * 100}%` }} /></div>
          <span className="muted">{t("safariStatsRow", { right: r.right, wrong: r.wrong })}</span>
          {r.hard.length > 0 && <div className="muted">{t("safariStatsHard", { words: r.hard.join(", ") })}</div>}
        </div>
      ))}
      <p className="muted">{t("safariStatsWhy")}</p>
    </div>
  );
}
