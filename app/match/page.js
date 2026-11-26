"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { vocab } from "@/lib/content";
import { resolveText } from "@/lib/engine";

export default function MatchMenu() {
  const { state, ready, lang, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const learned = (cat) => vocab.words.filter((w) => (cat ? w.cat === cat : true) && (state.vocab?.[w.id]?.right ?? 0) >= 2).length;
  const total = (cat) => vocab.words.filter((w) => (cat ? w.cat === cat : true)).length;
  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🧩 {t("matchTitle")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="muted center">{t("matchIntro")}</p>
      <div className="grid">
        {vocab.categories.map((c) => (
          <Link key={c.id} href={`/match/${c.id}`} className="card domain world" style={{ background: c.color }}>
            <span className="icon">{c.icon}</span>
            <span>{resolveText(c.title, lang)}</span>
            <span className="muted">{t("wordsLearned", { n: learned(c.id) })} / {total(c.id)}</span>
          </Link>
        ))}
        <Link href="/match/mix" className="card domain world" style={{ background: "#fff3c7" }}>
          <span className="icon">🎲</span>
          <span>{t("matchMix")}</span>
          <span className="muted">{t("wordsLearned", { n: learned() })} / {total()}</span>
        </Link>
        <Link href="/match/shapes" className="card domain world" style={{ background: "#e4dcff" }}>
          <span className="icon">🔷</span>
          <span>{t("matchShapes")}</span>
        </Link>
      </div>
    </>
  );
}
