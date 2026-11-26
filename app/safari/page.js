"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { sounds } from "@/lib/content";

const NAME = { rain: "safariRain", drums: "safariDrums", hunt: "safariHunt", blend: "safariBlend" };
const DESC = { rain: "safariRainDesc", drums: "safariDrumsDesc", hunt: "safariHuntDesc", blend: "safariBlendDesc" };

export default function SafariMenu() {
  const { state, ready, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🦜 {t("safariTitle")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="muted center">{t("safariIntro")}</p>
      <div className="grid">
        {sounds.games.map((g) => (
          <Link key={g.id} href={`/safari/${g.id}`} className="card domain world" style={{ background: g.color }}>
            <span className="icon">{g.icon}</span>
            <span>{t(NAME[g.id])}</span>
            <span className="muted">{t(DESC[g.id])}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
