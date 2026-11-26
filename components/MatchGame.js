"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import ItemFace from "./ItemFace";
import { Confetti, Mascot, Pic } from "./Visuals";
import { config, content, findDomain, vocab, strings } from "@/lib/content";
import { buildMatchRound, buildShapeMatchRound, recordAnswer, recordVocab, resolveText, touchStreak } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";

// Tap a picture, then tap its word (or its shape). Wrong taps shake; right ones lock in.
export default function MatchGame({ cat }) {
  const { state, setState, ready, lang, t } = useApp();
  const shapes = findDomain("shapes");
  const isShapes = cat === "shapes";
  const category = vocab.categories.find((c) => c.id === cat);
  const pool = cat === "mix" ? vocab.words : vocab.words.filter((w) => w.cat === cat);
  const [round, setRound] = useState(null);
  const [no, setNo] = useState(0);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [shake, setShake] = useState(null);
  const [msg, setMsg] = useState("");
  const [finished, setFinished] = useState(false);
  const [stars, setStars] = useState(0);
  const stateRef = useRef(state);
  const recent = useRef([]);
  const timer = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const speech = strings[lang].speechLang;
  const start = (n) => {
    const r = isShapes
      ? buildShapeMatchRound(shapes, stateRef.current, config, { lang, recent: recent.current })
      : buildMatchRound(pool, stateRef.current, config, { lang, recent: recent.current });
    recent.current = r.pairs.map((p) => p.k);
    setRound(r); setSel(null); setDone([]); setNo(n); setMsg("");
  };
  useEffect(() => {
    if (ready && state.child && !round && (isShapes || pool.length)) start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  if (!isShapes && !pool.length) return <p>Not found. <Link href="/match">{t("match")}</Link></p>;
  const sound = state.child.sound !== false;

  const pairOf = (k) => round.pairs.find((p) => p.k === k);
  const pickLeft = (k) => {
    if (done.includes(k)) return;
    const p = pairOf(k);
    setSel(k);
    sfx("tap", sound);
    speak(p.left.say, speech, p.left.audio);
  };
  const pickRight = (k) => {
    if (sel == null || done.includes(k)) return;
    const ok = sel === k;
    if (isShapes) setState((s) => recordAnswer(s, shapes, { target: sel, chosen: k, correct: ok, ms: 1500, type: "match" }, config));
    else setState((s) => recordVocab(s, sel, ok));
    if (!ok) {
      sfx("soft", sound);
      setShake(k); setMsg(t("matchWrong"));
      setTimeout(() => setShake(null), 450);
      return;
    }
    sfx("good", sound);
    setMsg(t("good")[Math.floor(Math.random() * t("good").length)]);
    setStars((n) => n + config.match.starsPerPair);
    setState((s) => ({ ...s, stars: s.stars + config.match.starsPerPair }));
    const nextDone = [...done, k];
    setDone(nextDone); setSel(null);
    if (nextDone.length === round.pairs.length) {
      sfx("win", sound);
      timer.current = setTimeout(() => {
        if (no + 1 >= config.match.rounds) {
          setState((s) => touchStreak({ ...s, sessions: s.sessions + 1 }));
          setFinished(true);
        } else start(no + 1);
      }, config.match.doneDelayMs);
    }
  };

  const title = isShapes ? t("matchShapes") : cat === "mix" ? t("matchMix") : resolveText(category.title, lang);
  if (finished) {
    return (
      <div className="card center">
        <Confetti />
        <Mascot mood="cheer" size={110} />
        <h1>{t("matchDone")}</h1>
        <p>⭐ +{stars}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { setFinished(false); setStars(0); start(0); }}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/match">{t("match")}</Link>
        </div>
      </div>
    );
  }
  if (!round) return null;

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/match"><span className="arr">←</span> {t("match")}</Link>
        <strong>🧩 {title}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="muted center">{t("matchRound", { i: no + 1, n: config.match.rounds })} · {isShapes ? t("matchTapShape") : t("matchTapWord")}</p>
      <div className="matchgrid">
        <div className="matchcol">
          {round.lefts.map((k) => {
            const p = pairOf(k);
            return (
              <button key={k} className={`mcard mpic ${sel === k ? "sel" : ""} ${done.includes(k) ? "ok" : ""}`} onClick={() => pickLeft(k)} disabled={done.includes(k)}>
                <Pic pic={p.left} size="3.6rem" alt={p.left.say} />
              </button>
            );
          })}
        </div>
        <div className="matchcol">
          {round.rights.map((k) => {
            const p = pairOf(k);
            return (
              <button
                key={k}
                className={`mcard mword ${done.includes(k) ? "ok" : ""} ${shake === k ? "shake" : ""} ${sel == null ? "wait" : ""}`}
                onClick={() => pickRight(k)}
                disabled={done.includes(k)}
                lang={lang}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {isShapes ? <ItemFace domain={shapes} id={p.right.shape} lang={lang} size={64} /> : p.right.text}
              </button>
            );
          })}
        </div>
      </div>
      <div className="feedback"><Mascot mood={msg === t("matchWrong") ? "think" : "happy"} size={50} /><span>{msg}</span></div>
    </>
  );
}
