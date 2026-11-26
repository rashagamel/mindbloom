"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { config, findDomain } from "@/lib/content";
import { buildQuestion, resolveText } from "@/lib/engine";
import Session from "./Session";
import { Confetti } from "./Visuals";

// Free practice: the engine picks anything unlocked, focusing on what needs work.
export default function Game({ domainId }) {
  const { state, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const [done, setDone] = useState(null);
  const [round, setRound] = useState(0);
  if (!ready) return null;
  if (!domain) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;

  if (done) {
    const stars = done.correct * (config.stars.perAnswer + config.stars.bonusCorrect) + (done.total - done.correct) * config.stars.perAnswer;
    return (
      <div className="card center">
        <Confetti />
        <div className="bigemoji">🌟</div>
        <h1>{t("sessionDone", { name: state.child.name })}</h1>
        <p>{t("starsEarned", { n: stars })}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { setDone(null); setRound((r) => r + 1); }}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/">{t("home")}</Link>
        </div>
      </div>
    );
  }

  return (
    <Session
      key={round}
      domain={domain}
      total={config.session.questions}
      title={resolveText(domain.title, lang)}
      backHref="/"
      makeQuestion={(s, recent) => buildQuestion(domain, s, config, { recent })}
      onComplete={setDone}
    />
  );
}
