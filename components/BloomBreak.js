"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { Mascot } from "./Visuals";
import { config, wellbeing } from "@/lib/content";
import { pickBreak } from "@/lib/wellbeing";
import { resolveText } from "@/lib/engine";
import { sfx } from "@/lib/sfx";

let lastId = null; // so two breaks in a row are never the same one

// A short movement or breathing break. It only appears between questions.
// The "Skip" button is always there: an adult or the child stays in control.
export default function BloomBreak({ reason = "time", onDone }) {
  const { state, lang, t } = useApp();
  const [br] = useState(() => {
    const b = pickBreak(wellbeing.breaks, { avoid: lastId });
    lastId = b.id;
    return b;
  });
  const total = config.wellbeing.breakSeconds;
  const [left, setLeft] = useState(total);
  const [inhale, setInhale] = useState(true);
  const doneRef = useRef(false);
  const sound = state.child?.sound !== false;

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0 && !doneRef.current) { doneRef.current = true; sfx("win", sound); }
  }, [left, sound]);
  useEffect(() => {
    if (br.kind !== "breathe") return;
    const id = setInterval(() => setInhale((v) => !v), 4000);
    return () => clearInterval(id);
  }, [br.kind]);

  const finished = left === 0;
  return (
    <div className="card center breakcard" role="dialog" aria-live="polite">
      <Mascot mood="cheer" size={96} />
      <h1>{t(reason === "misses" ? "breakTitleMiss" : "breakTitleTime")}</h1>
      <div className="breakemoji" aria-hidden="true">{br.emoji}</div>
      <p className="breaktext">{resolveText(br.text, lang)}</p>
      {br.kind === "breathe" && (
        <div className="breath" style={{ transform: `scale(${inhale ? 1.35 : 0.8})` }} aria-hidden="true">🎈</div>
      )}
      {br.kind === "breathe" && <p className="breaktext"><b>{t(inhale ? "breatheIn" : "breatheOut")}</b></p>}
      <div className="bar" aria-hidden="true"><span style={{ width: `${((total - left) / total) * 100}%` }} /></div>
      <p className="muted">{finished ? "✅" : t("breakLeft", { n: left })}</p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={onDone} disabled={!finished}>{t("breakReady")}</button>
        <button className="linkbtn" onClick={onDone}>{t("breakSkip")}</button>
      </div>
    </div>
  );
}
