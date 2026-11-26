"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { config, findDomain, itemLabel, domainLang, domainDir } from "@/lib/content";
import { buildMemory, recordAnswer, resolveText } from "@/lib/engine";
import ItemFace from "./ItemFace";

export default function MemoryGame({ domainId }) {
  const { state, setState, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const [board, setBoard] = useState(null);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const timer = useRef(null);
  const stateRef = useRef(state);
  const startedAt = useRef(Date.now());
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const fresh = () => {
    setBoard(buildMemory(domain, stateRef.current, config));
    setOpen([]); setMatched([]); setStars(0); setDone(false); setMessage("");
    busy.current = false;
    startedAt.current = Date.now();
  };
  useEffect(() => {
    if (ready && state.child && domain?.memory && !board) fresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.child]);

  if (!ready) return null;
  if (!domain?.memory) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  if (!board) return null;

  const cl = domainLang(domain, lang);
  const dir = domainDir(domain, lang);
  const log = (target, chosen, correct) => {
    setStars((n) => n + config.stars.perAnswer + (correct ? config.stars.bonusCorrect : 0));
    setState((s) => recordAnswer(s, domain, { target, chosen, correct, ms: Date.now() - startedAt.current, type: "memory" }, config));
  };

  const flip = (i) => {
    if (busy.current || open.includes(i) || matched.includes(board.cards[i].pairId)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    busy.current = true;
    const [x, y] = next.map((k) => board.cards[k]);
    if (x.pairId === y.pairId) {
      log(x.pairId, x.pairId, true);
      const all = [...matched, x.pairId];
      const praise = t("good");
      setMessage(praise[Math.floor(Math.random() * praise.length)]);
      timer.current = setTimeout(() => {
        setMatched(all);
        setOpen([]);
        busy.current = false;
        if (all.length === board.pairs.length) {
          setState((s) => ({ ...s, sessions: s.sessions + 1 }));
          setDone(true);
        }
      }, 500);
    } else {
      if (x.kind !== y.kind) {
        const a = x.kind === "a" ? x : y;
        const b = x.kind === "a" ? y : x;
        log(a.pairId, b.pairId, false);
      }
      setMessage("");
      timer.current = setTimeout(() => {
        setOpen([]);
        busy.current = false;
      }, config.memory.flipBackMs);
    }
  };

  if (done) {
    return (
      <div className="card center">
        <div className="bigemoji">🌟</div>
        <h1>{t("memoryDone")}</h1>
        <p>{t("starsEarned", { n: stars })}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={fresh}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/">{t("home")}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>{resolveText(domain.title, lang)}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="ask center">{t("askMemory")}</p>
      <div className="memory" dir={dir}>
        {board.cards.map((c, i) => {
          const shown = open.includes(i) || matched.includes(c.pairId);
          return (
            <button
              key={c.key}
              className={`mcard ${shown ? "up" : ""} ${matched.includes(c.pairId) ? "ok" : ""}`}
              lang={cl}
              onClick={() => flip(i)}
              aria-label={shown ? undefined : "?"}
            >
              {shown ? (c.kind === "a" ? <ItemFace domain={domain} id={c.pairId} lang={cl} size={56} /> : c.picture) : "❓"}
            </button>
          );
        })}
      </div>
      <div className="feedback" aria-live="polite">{message}</div>
    </>
  );
}
