"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Mascot } from "@/components/Visuals";
import { content, config, itemLabel, domainLang } from "@/lib/content";
import { buildSuperpower } from "@/lib/superpower";

const POWERS = {
  see: { icon: "👀", name: "powerSee", text: "powerSeeText", tip: "superTipSee", href: "/match", color: "#dff1ff" },
  hear: { icon: "👂", name: "powerHear", text: "powerHearText", tip: "superTipHear", href: "/safari", color: "#e1f6df" },
  do: { icon: "🖐️", name: "powerDo", text: "powerDoText", tip: "superTipDo", href: "/", color: "#ffe3da" },
  all: { icon: "🌈", name: "powerAll", text: "powerAllText", tip: "superTipAll", href: "/", color: "#ece4ff" },
  none: { icon: "🔍", name: "powerNone", text: "powerNoneText", tip: "superTipNone", href: "/", color: "#fff3c7" },
};

// A child-facing page. Strengths first, effort celebrated, nothing here says "weak" or "bad".
export default function SuperPower() {
  const { state, ready, lang, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const sp = buildSuperpower(state, content, config);
  const p = POWERS[sp.power ?? "none"];
  const chip = (r) => {
    const d = content.domains.find((x) => x.id === r.domainId);
    return <span key={`${r.domainId}:${r.itemId}`} className="chip" lang={domainLang(d, lang)}>{itemLabel(d, r.itemId, domainLang(d, lang))}</span>;
  };
  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🦸 {t("superTitle")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>

      <div className="card center superhero" style={{ background: p.color }}>
        <div className="heroavatar">{state.child.avatar ?? "🙂"}<span className="cape">{p.icon}</span></div>
        <h1 style={{ marginBottom: 4 }}>{state.child.name}: {t(p.name)}</h1>
        <p className="breaktext">{t(p.text)}</p>
        <Mascot mood="cheer" size={80} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>⭐ {t("superKnow")}</h2>
        {sp.know.length ? <div className="chips">{sp.know.map(chip)}</div> : <p className="muted">{t("superKnowEmpty")}</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>🌱 {t("superGrowing")}</h2>
        {sp.growing.length ? <div className="chips">{sp.growing.map(chip)}</div> : <p className="muted">{t("superGrowingEmpty")}</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>💪 {t("superBrave")}</h2>
        <p className="breaktext" style={{ margin: 0 }}>{sp.brave > 0 ? t("superBraveText", { n: sp.brave }) : t("superBraveNone")}</p>
      </div>

      <div className="card mission">
        <div className="missionicon">💡</div>
        <div>
          <b>{t("superTry")}</b>
          <p>{t(p.tip)}</p>
          {p.href !== "/" && <Link className="btn small" href={p.href}>{t("superGo")}</Link>}
        </div>
      </div>
      <p className="muted center">{t("superNote")}</p>
    </>
  );
}
