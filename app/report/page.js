"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import Insights, { SkillBars, useInsightText } from "@/components/Insights";
import { content, config, levels, strings } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { explain } from "@/lib/insights";
import { prePost } from "@/lib/report";

export default function Report() {
  const { ready, state, lang, t } = useApp();
  const { text } = useInsightText();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const items = explain(state, content, config, levels);
  const pct = (x) => `${Math.round(x * 100)}%`;
  const rows = content.domains.map((d) => ({ d, pp: prePost(state.assessments, d.id) }));
  return (
    <>
      <div className="topbar noprint">
        <Link className="back" href="/parent"><span className="arr">←</span> {t("parents")}</Link>
        <strong>📄 {t("childReport")}</strong>
        <button className="btn small" onClick={() => window.print()}>🖨️ {t("reportPrint")}</button>
      </div>
      <article className="sheet report" dir={strings[lang].dir} data-testid="report">
        <header>
          <h2>🌼 MindBloom — {t("childReport")}</h2>
          <div className="sheetlines">
            <span>{state.child.avatar ?? ""} <i>{state.child.name}</i></span>
            <span>{t("reportDate")}: <i>{new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</i></span>
            <span>⭐ <i>{state.stars}</i></span>
          </div>
        </header>
        <h3>{t("skillProfile")}</h3>
        <SkillBars state={state} />
        <h3>{t("reportBefore")}</h3>
        <table className="history">
          <thead><tr><th></th><th>{t("reportFirst")}</th><th>{t("reportLatest")}</th><th>{t("reportChange")}</th></tr></thead>
          <tbody>
            {rows.map(({ d, pp }) => (
              <tr key={d.id}>
                <td>{d.icon} {resolveText(d.title, lang)}</td>
                {pp ? <><td>{pct(pp.first)}</td><td>{pp.n > 1 ? pct(pp.latest) : "–"}</td><td>{pp.change == null ? "–" : `${pp.change > 0 ? "+" : ""}${Math.round(pp.change * 100)}`}</td></> : <td colSpan={3} className="muted">{t("reportNone")}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t("insights")}</h3>
        <ul className="plain">{items.map((o, i) => <li key={i}>{text(o)}</li>)}</ul>
        <h3>{t("reportHome")}</h3>
        <p>{t("suggestionsHome")}</p>
        <p className="muted small">{t("insightsNote")} {t("reportFooter")}</p>
      </article>
    </>
  );
}
