"use client";
import { useApp } from "./AppProvider";
import { content, config, levels, itemLabel, domainLang } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { explain, formatStats, skillProfile } from "@/lib/insights";

// One sentence per observation, in the app language.
export function useInsightText() {
  const { t, lang } = useApp();
  const area = (id) => { const d = content.domains.find((x) => x.id === id); return d ? resolveText(d.title, lang) : id; };
  const text = (o) => {
    const d = content.domains.find((x) => x.id === o.domainId);
    const cl = d ? domainLang(d, lang) : lang;
    switch (o.kind) {
      case "few": return t("explainFew", { n: o.n });
      case "confusion": return t("explainConfusion", { a: itemLabel(d, o.a, cl), b: itemLabel(d, o.b, cl), area: area(o.domainId) });
      case "slow": return t("explainSlow", { area: area(o.domainId) });
      case "format": return t("explainFormat", { best: t("fmt" + cap(o.best)), worst: t("fmt" + cap(o.worst)), p1: Math.round(o.bestAcc * 100), p2: Math.round(o.worstAcc * 100) });
      case "trend": return t(o.dir === "up" ? "explainTrendUp" : o.dir === "down" ? "explainTrendDown" : "explainTrendFlat", { pts: o.pts });
      case "recovery": return t("explainRecovery", { n: o.n, back: o.back, rechecks: o.rechecks });
      case "strong": return t("explainStrong", { area: area(o.domainId), n: o.n });
      default: return "";
    }
  };
  const barLabel = (b) => (b.kind === "domain" ? area(b.id) : t(b.id === "writing" ? "axisWriting" : "axisMemory"));
  return { text, barLabel };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function SkillBars({ state, minN = 3 }) {
  const { barLabel } = useInsightText();
  const bars = skillProfile(state, content, config, minN);
  return (
    <div data-testid="skill-bars">
      {bars.map((b) => (
        <div key={b.id}>
          <div className="barrow"><span>{barLabel(b)}</span><b>{Math.round(b.value * 100)}%</b></div>
          <div className="bar" role="img" aria-label={`${barLabel(b)} ${Math.round(b.value * 100)}%`}><span style={{ width: `${Math.round(b.value * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Insights({ state }) {
  const { t } = useApp();
  const { text } = useInsightText();
  const items = explain(state, content, config, levels);
  return (
    <div className="card" data-testid="insights">
      <h2 style={{ marginTop: 0 }}>🔍 {t("insights")}</h2>
      <h3>{t("skillProfile")}</h3>
      <SkillBars state={state} />
      <h3>{t("insights")}</h3>
      <ul className="plain">{items.map((o, i) => <li key={i}>{text(o)}</li>)}</ul>
      <p className="muted small">{t("insightsNote")}</p>
    </div>
  );
}
