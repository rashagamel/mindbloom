"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import Session from "./Session";
import { Mascot, Confetti } from "./Visuals";
import { SkillBars } from "./Insights";
import { content, config, levels, strings } from "@/lib/content";
import { assessmentPlan, buildAssessmentQuestion, summarizeAssessment, addAssessment, resolveText } from "@/lib/engine";

// One short, quiet check in every area. Each result is saved as the first check-up, so it is the "before".
export default function StarterCheck() {
  const { state, setState, ready, lang, t } = useApp();
  const [stage, setStage] = useState("intro"); // intro | 0..n-1 | done
  const plans = useRef(null);
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const domains = content.domains;

  if (stage === "intro") {
    return (
      <div className="card center">
        <Mascot mood="think" size={100} />
        <h1>{t("starterTitle")}</h1>
        <p>{t("starterBody")}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { plans.current = domains.map((d) => assessmentPlan(d, config).slice(0, config.starter.perDomain)); setStage(0); }}><span className="arr">▶</span> {t("starterGo")}</button>
          <Link className="btn secondary" href="/" onClick={() => setState((s) => ({ ...s, child: { ...s.child, starterSkipped: true } }))}>{t("starterSkip")}</Link>
        </div>
        <p className="muted small">{t("checkupNote")}</p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="card center">
        <Confetti n={20} />
        <Mascot mood="cheer" size={96} />
        <h1>{t("starterDone")}</h1>
        <div className="left"><h2>{t("starterShow")}</h2><SkillBars state={state} minN={1} /></div>
        <div className="actions" style={{ justifyContent: "center" }}><Link className="btn" href="/">{t("starterNext")}</Link></div>
        <p className="muted small">{t("checkupNote")}</p>
      </div>
    );
  }

  const domain = domains[stage];
  const plan = plans.current[stage];
  return (
    <Session
      key={domain.id}
      domain={domain}
      quiet
      total={plan.length}
      title={`🌟 ${resolveText(domain.title, lang)} (${stage + 1}/${domains.length})`}
      backHref="/"
      makeQuestion={(s, recent, i) => buildAssessmentQuestion(domain, s, config, plan[i])}
      onComplete={({ answers }) => {
        const summary = summarizeAssessment(domain, answers, levels);
        setState((s) => addAssessment(s, { at: Date.now(), domainId: domain.id, total: summary.total, correct: summary.correct, answers, starter: true }, config));
        setStage(stage + 1 >= domains.length ? "done" : stage + 1);
      }}
    />
  );
}
