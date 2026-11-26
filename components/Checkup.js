"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import Session from "./Session";
import { Mascot, Confetti } from "./Visuals";
import ItemFace from "./ItemFace";
import { config, findDomain, levels, itemLabel, domainLang, worldOf } from "@/lib/content";
import { assessmentPlan, buildAssessmentQuestion, summarizeAssessment, addAssessment, resolveText } from "@/lib/engine";

// A fixed-length check without hints. Saved so the parent can compare before / after.
export default function Checkup({ domainId }) {
  const { state, setState, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const plan = useRef(null);
  const [stage, setStage] = useState("intro");
  const [report, setReport] = useState(null);
  if (!ready) return null;
  if (!domain) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const cl = domainLang(domain, lang);
  const title = `🩺 ${resolveText(domain.title, lang)}`;

  if (stage === "intro") {
    return (
      <>
        <div className="topbar"><Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link><strong>{title}</strong><span /></div>
        <div className="card center">
          <Mascot mood="think" size={100} />
          <h1>{t("checkup")}</h1>
          <p>{t("checkupIntro")}</p>
          <button className="btn" onClick={() => { plan.current = assessmentPlan(domain, config); setStage("quiz"); }}><span className="arr">▶</span> {t("checkupStart")}</button>
          <p className="muted small">{t("checkupNote")}</p>
        </div>
      </>
    );
  }

  if (stage === "quiz") {
    return (
      <Session
        domain={domain}
        quiet
        total={plan.current.length}
        title={title}
        backHref="/"
        makeQuestion={(s, recent, i) => buildAssessmentQuestion(domain, s, config, plan.current[i])}
        onComplete={({ answers }) => {
          const summary = summarizeAssessment(domain, answers, levels);
          const previous = state.assessments.filter((a) => a.domainId === domainId).at(-1) ?? null;
          setState((s) => addAssessment(s, { at: Date.now(), domainId, total: summary.total, correct: summary.correct, answers }, config));
          setReport({ summary, previous });
          setStage("result");
        }}
      />
    );
  }

  const { summary, previous } = report;
  const diff = previous ? summary.correct - previous.correct : null;
  const world = worldOf(domainId);
  return (
    <div className="card center">
      <Confetti n={20} />
      <Mascot mood="cheer" size={96} />
      <h1>{t("checkupResult")}</h1>
      <div className="bigscore">{t("checkupScore", { n: summary.correct, m: summary.total })}</div>
      <p className="muted">
        {diff == null ? t("checkupFirst") : diff > 0 ? t("checkupUp", { d: diff }) : diff < 0 ? t("checkupDown", { d: -diff }) : t("checkupSame")}
      </p>
      <div className="left">
        <h2>{t("checkupMixed")}</h2>
        {summary.pairs.length === 0 ? (
          <p>{t("checkupAllGood")}</p>
        ) : (
          <div className="pairs">
            {summary.pairs.map((p) => (
              <span key={p.ids.join()} className="pair" lang={cl}>{p.ids.map((id, i) => <span key={id}>{i > 0 && "  ↔  "}<ItemFace domain={domain} id={id} lang={cl} size={40} /></span>)}</span>
            ))}
          </div>
        )}
      </div>
      <div className="actions" style={{ justifyContent: "center" }}>
        {summary.recommendLevel && world && (
          <Link className="btn" href={`/level/${domainId}/${summary.recommendLevel}`}>🎯 {t("checkupRecommend")}</Link>
        )}
        <Link className="btn secondary" href="/">{t("home")}</Link>
      </div>
      <p className="muted small">{t("checkupNote")}</p>
    </div>
  );
}
