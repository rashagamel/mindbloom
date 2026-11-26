"use client";
import { useEffect, useRef, useState } from "react";
import { dotsLetter, partsLetter } from "@/lib/engine";
import { itemLabel } from "@/lib/content";
import { sfx } from "@/lib/sfx";

// ---------- Arabic dots ----------
// The dotless "skeleton" sits in the middle; tap the zone above or below to add dots (0..3).
export function DotsBoard({ skeleton, above, below, setAbove, setBelow, locked, shown, lang }) {
  const cycle = (n, set) => !locked && set((n + 1) % 4);
  const zone = (n, set, name) => (
    <button type="button" className={`dotzone ${n ? "has" : ""}`} onClick={() => cycle(n, set)} disabled={locked} aria-label={name}>
      {Array.from({ length: n }, (_, i) => <i key={i} className="dotball" />)}
      {n === 0 && <span className="dotplus">＋</span>}
    </button>
  );
  return (
    <div className="dotsboard" dir="rtl" lang={lang}>
      {zone(above, setAbove, "above")}
      <div className={`skeleton ${shown ? "reveal" : ""}`} key={shown ?? "skeleton"}>{shown ?? skeleton}</div>
      {zone(below, setBelow, "below")}
    </div>
  );
}

export function DotsGame({ q, domain, lang, locked, onSubmit, t, sound }) {
  const info = domain.dots[q.target];
  const [above, setAbove] = useState(0);
  const [below, setBelow] = useState(0);
  const check = () => {
    const made = dotsLetter(domain, info.skeleton, above, below);
    sfx("tap", sound);
    onSubmit(made === q.target, made);
  };
  return (
    <div className="card center">
      
      <DotsBoard
        skeleton={info.skeleton} above={above} below={below} setAbove={setAbove} setBelow={setBelow}
        locked={locked} shown={locked ? itemLabel(domain, q.target, lang) : null} lang={lang}
      />
      {!locked && <button className="btn" onClick={check}>✓ {t("dotsCheck")}</button>}
    </div>
  );
}

// ---------- b d p q: put the ball on the stick ----------
const POS = { left: 66, right: 154, top: 64, bottom: 156 };
export function PartsGame({ q, domain, locked, onSubmit, t, sound }) {
  const [placed, setPlaced] = useState(null);
  const slots = Object.entries(domain.parts).map(([id, p]) => ({ id, ...p }));
  const answer = domain.parts[q.target];
  const pick = (s) => {
    if (locked || placed) return;
    setPlaced(s);
    sfx("pop", sound);
    onSubmit(s.id === q.target, s.id);
  };
  const made = placed ? placed.id : null;
  return (
    <div className="card center">
      <svg className="partsvg" viewBox="0 0 220 220" role="group" aria-label="letter builder">
        <rect x="100" y="24" width="20" height="172" rx="10" fill="#6b6a78" />
        {slots.map((s) => {
          const isPlaced = placed?.id === s.id;
          const isAnswer = locked && s.x === answer.x && s.y === answer.y;
          return (
            <g key={s.id} onClick={() => pick(s)} className={`slot-g ${isPlaced ? "placed" : ""}`} role="button" aria-label={`${s.x} ${s.y}`}>
              <circle cx={POS[s.x]} cy={POS[s.y]} r="44" fill="transparent" />
              <circle
                cx={POS[s.x]} cy={POS[s.y]} r="26"
                fill="none" strokeWidth="18"
                stroke={isPlaced ? (s.id === q.target ? "#3bb273" : "#f4b942") : isAnswer ? "#3bb273" : "#e6dccb"}
                opacity={isPlaced || isAnswer ? 1 : 0.55}
              />
            </g>
          );
        })}
      </svg>
      {made && <div className="made">{t("dotsMade")}: <b lang="en">{made}</b></div>}
    </div>
  );
}

// ---------- numbers: a frog hops along the number line ----------
export function Hop({ n, sound, t }) {
  const [h, setH] = useState(0);
  const [run, setRun] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    setH(0);
    let k = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      k += 1;
      setH(k);
      sfx("tap", sound);
      if (k >= n) clearInterval(timer.current);
    }, 650);
    return () => clearInterval(timer.current);
  }, [n, run, sound]);
  return (
    <div className="card hop" dir="ltr">
      <div className="pond">
        <span className="frog" key={h} style={{ left: `${(h / 10) * 100}%` }}>🐸</span>
        <div className="line">
          {Array.from({ length: 11 }, (_, i) => <span key={i} className={`tick ${i <= h ? "on" : ""}`}>{i}</span>)}
        </div>
      </div>
      <div className="center"><button className="btn secondary small" onClick={() => setRun((r) => r + 1)}>🔁 {t("hopReplay")}</button></div>
    </div>
  );
}
