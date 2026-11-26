"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Monster, Mascot, Confetti } from "./Visuals";
import ItemFace from "./ItemFace";
import { config, findDomain, itemLabel, domainLang, domainSpeechLang, domainDir } from "@/lib/content";
import { buildMonsterRound, recordAnswer, resolveText, touchStreak } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";

// Feed the monster only the letter it asks for. Decoys are its look-alike twins.
export default function MonsterGame({ domainId }) {
  const { state, setState, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const [round, setRound] = useState(null);
  const [roundNo, setRoundNo] = useState(0);
  const [eaten, setEaten] = useState([]);
  const [shaking, setShaking] = useState(null);
  const [mood, setMood] = useState("hungry");
  const [done, setDone] = useState(false);
  const stateRef = useRef(state);
  const recent = useRef([]);
  const timer = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = (n) => {
    const r = buildMonsterRound(domain, stateRef.current, config, { recent: recent.current });
    recent.current = [...recent.current, r.target].slice(-4);
    setRound(r); setEaten([]); setMood("hungry"); setRoundNo(n);
    const item = domain.items.find((i) => i.id === r.target);
    const cl = domainLang(domain, lang);
    setTimeout(() => speak(resolveText(item.say, cl), domainSpeechLang(domain, lang), resolveText(item.audio, cl)), 300);
  };
  useEffect(() => {
    if (ready && domain && state.child && !round) start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;
  if (!domain) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const sound = state.child.sound !== false;
  const cl = domainLang(domain, lang);
  const dir = domainDir(domain, lang);

  const tap = (tile) => {
    if (!round || eaten.includes(tile.k) || done || mood === "locked") return;
    const ok = tile.id === round.target;
    setState((s) => recordAnswer(s, domain, { target: round.target, chosen: tile.id, correct: ok, ms: 1500, type: "monster" }, config));
    sfx(ok ? "good" : "soft", sound);
    if (!ok) {
      setShaking(tile.k); setMood("yuck");
      setTimeout(() => { setShaking(null); setMood("hungry"); }, 600);
      return;
    }
    const next = [...eaten, tile.k];
    setEaten(next); setMood("yum");
    setTimeout(() => setMood((m) => (m === "yum" ? "hungry" : m)), 500);
    if (next.length >= round.need) {
      sfx("win", sound);
      timer.current = setTimeout(() => {
        if (roundNo + 1 >= config.monster.rounds) {
          setState((s) => touchStreak({ ...s, sessions: s.sessions + 1 }));
          setDone(true);
        } else start(roundNo + 1);
      }, config.monster.readyDelayMs);
    }
  };

  if (done) {
    return (
      <div className="card center">
        <Confetti />
        <Monster mood="yum" fed={3} size={170} />
        <h1>{t("monsterDone")}</h1>
        <p>⭐ {state.stars}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { setDone(false); recent.current = []; start(0); }}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/">{t("home")}</Link>
        </div>
      </div>
    );
  }
  if (!round) return null;

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🐲 {t("monster")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <div className="dots" style={{ justifyContent: "center", marginBottom: 6 }}>
        {Array.from({ length: config.monster.rounds }, (_, i) => <span key={i} className={`dot ${i < roundNo ? "done" : i === roundNo ? "now" : ""}`} />)}
      </div>
      <div className="monsterstage">
        <div className="ask big" lang={cl} dir={dir}>
          {t("monsterAsk")} <b className="askletter"><ItemFace domain={domain} id={round.target} lang={cl} size={64} /></b>
          <button className="listen mini" aria-label="listen" onClick={() => {
            const item = domain.items.find((i) => i.id === round.target);
            speak(resolveText(item.say, cl), domainSpeechLang(domain, lang), resolveText(item.audio, cl));
          }}>🔊</button>
        </div>
        <Monster mood={mood} fed={eaten.length} />
        <div className="meter">{Array.from({ length: round.need }, (_, i) => <i key={i} className={i < eaten.length ? "on" : ""}>🍬</i>)}</div>
      </div>
      <div className="pile" dir={dir}>
        {round.pile.map((tile, i) => (
          <button
            key={tile.k}
            lang={cl}
            className={`food ${eaten.includes(tile.k) ? "gone" : ""} ${shaking === tile.k ? "shake" : ""}`}
            style={{ animationDelay: `${(i % 5) * 0.25}s` }}
            onClick={() => tap(tile)}
            disabled={eaten.includes(tile.k)}
          >
            <ItemFace domain={domain} id={tile.id} lang={cl} size={56} />
          </button>
        ))}
      </div>
      <div className="feedback"><Mascot mood={mood === "yuck" ? "think" : "happy"} size={50} /><span>{mood === "yuck" ? t("monsterYuck") : mood === "yum" ? t("monsterYum") : ""}</span></div>
    </>
  );
}
