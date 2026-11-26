"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import Session from "./Session";
import MeetCards from "./MeetCards";
import { Confetti, Mascot } from "./Visuals";
import { config, findDomain } from "@/lib/content";
import { buildQuestion, findMissions, resolveText } from "@/lib/engine";

// Twin Detective: look at the clues for a look-alike group, then a short drill on just those items.
export default function TwinsRunner({ domainId, groupIndex }) {
  const { state, setState, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const group = domain?.groups?.[groupIndex];
  const [stage, setStage] = useState("clues");
  const [round, setRound] = useState(0);
  if (!ready) return null;
  if (!group) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;

  const title = `🕵️ ${t("twinMission")}`;

  if (stage === "clues") {
    return (
      <>
        <div className="topbar">
          <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
          <strong>{title}</strong>
          <span className="stars">⭐ {state.stars}</span>
        </div>
        <div className="card center"><Mascot mood="think" size={80} /><p>{t("twinsIntro")}</p></div>
        <MeetCards domainId={domainId} ids={group} onDone={() => setStage("drill")} />
      </>
    );
  }

  if (stage === "drill") {
    return (
      <Session
        key={round}
        domain={domain}
        total={config.twins.drillQuestions}
        title={title}
        backHref="/"
        makeQuestion={(s, recent) => buildQuestion(domain, s, config, { recent, pool: group, known: group, types: ["sound", ...["parts", "dots", "example"].filter((x) => domain.questionTypes.includes(x))] })}
        onComplete={() => {
          setState((s) => {
            const key = `${domainId}:${groupIndex}`;
            const still = findMissions(s, { domains: [domain] }, config).some((m) => m.groupIndex === groupIndex);
            return still || s.solved.includes(key) ? s : { ...s, solved: [...s.solved, key] };
          });
          setStage("done");
        }}
      />
    );
  }

  const solved = !findMissions(state, { domains: [domain] }, config).some((m) => m.groupIndex === groupIndex);
  return (
    <div className="card center">
      {solved && <Confetti />}
      <Mascot mood={solved ? "cheer" : "think"} size={96} />
      <h1>{solved ? t("caseSolved") : t("caseTry")}</h1>
      <div className="actions" style={{ justifyContent: "center" }}>
        {!solved && <button className="btn" onClick={() => { setRound((r) => r + 1); setStage("drill"); }}>{t("playAgain")}</button>}
        <Link className="btn secondary" href="/">{t("home")}</Link>
      </div>
    </div>
  );
}
