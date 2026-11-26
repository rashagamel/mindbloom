"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { owl } from "@/lib/content";

const NAME = { look: "owlLook", line: "owlLine", more: "owlMore" };
const DESC = { look: "owlLookDesc", line: "owlLineDesc", more: "owlMoreDesc" };

export default function OwlMenu() {
  const { state, ready, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🦉 {t("owlTitle")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="muted center">{t("owlIntro")}</p>
      <div className="grid">
        {owl.games.map((g) => (
          <Link key={g.id} href={`/owl/${g.id}`} className="card domain world" style={{ background: g.color }}>
            <span className="icon">{g.icon}</span>
            <span>{t(NAME[g.id])}</span>
            <span className="muted">{t(DESC[g.id])}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
