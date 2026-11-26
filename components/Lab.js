"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { DotsBoard } from "./ShapeGames";
import { content } from "@/lib/content";
import { dotsLetter, partsLetter } from "@/lib/engine";
import { speak } from "@/lib/speech";

const en = content.domains.find((d) => d.id === "en-letters");
const ar = content.domains.find((d) => d.id === "ar-letters");
const flip = (v) => ({ left: "right", right: "left", top: "bottom", bottom: "top" }[v]);

// Flip, mirror or turn a shape and see which twin it becomes.
function Flipper({ start, becomes, allow, t }) {
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [turn, setTurn] = useState(0);
  const mirrored = sx === -1, flipped = sy === -1, turned = turn % 360 !== 0;
  const became = becomes({ mirrored, flipped, turned });
  const reset = () => { setSx(1); setSy(1); setTurn(0); };
  const btn = (key, label, fn) => allow.includes(key) && <button className="btn secondary" onClick={fn}>{label}</button>;
  return (
    <div className="center">
      <div className="labstage">
        <div className="labglyph" lang="en" style={{ transform: `rotate(${turn}deg) scale(${sx}, ${sy})` }}>{start}</div>
      </div>
      <div className="labresult" aria-live="polite">
        {became && became !== start ? <>{t("labBecame")}: <b lang="en">{became}</b></> : <>&nbsp;</>}
      </div>
      <div className="actions" style={{ justifyContent: "center" }}>
        {btn("mirror", `↔ ${t("labMirror")}`, () => setSx((v) => -v))}
        {btn("flip", `↕ ${t("labFlip")}`, () => setSy((v) => -v))}
        {btn("turn", `🔄 ${t("labTurn")}`, () => setTurn((v) => v + 180))}
        <button className="btn danger" onClick={reset}>↺</button>
      </div>
    </div>
  );
}

export default function Lab() {
  const { ready, state, t } = useApp();
  const [letter, setLetter] = useState("b");
  const [num, setNum] = useState("6");
  const [skel, setSkel] = useState("ٮ");
  const [above, setAbove] = useState(0);
  const [below, setBelow] = useState(0);
  if (!ready) return null;

  const skeletons = [...new Set(Object.values(ar.dots).map((d) => d.skeleton))];
  const made = dotsLetter(ar, skel, above, below);
  const partsBecome = ({ mirrored, flipped, turned }) => {
    const p = en.parts[letter];
    let x = p.x, y = p.y;
    if (mirrored) x = flip(x);
    if (flipped) y = flip(y);
    if (turned) { x = flip(x); y = flip(y); }
    return partsLetter(en, x, y);
  };
  const numBecome = ({ turned }) => (turned ? { 6: "9", 9: "6" }[num] : num);

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🔬 {t("lab")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <p className="muted center">{t("labIntro")}</p>

      <div className="card">
        <h2>b d p q</h2>
        <div className="pickrow">
          {Object.keys(en.parts).map((l) => (
            <button key={l} lang="en" className={`pick ${l === letter ? "on" : ""}`} onClick={() => setLetter(l)}>{l}</button>
          ))}
        </div>
        <Flipper key={letter} start={letter} becomes={partsBecome} allow={["mirror", "flip", "turn"]} t={t} />
      </div>

      <div className="card">
        <h2>6 9</h2>
        <div className="pickrow">
          {["6", "9"].map((l) => (
            <button key={l} className={`pick ${l === num ? "on" : ""}`} onClick={() => setNum(l)}>{l}</button>
          ))}
        </div>
        <Flipper key={num} start={num} becomes={numBecome} allow={["turn"]} t={t} />
      </div>

      <div className="card center">
        <h2>ب ت ث ن ي</h2>
        <p className="muted">{t("labDotsTitle")}</p>
        <div className="pickrow" dir="rtl">
          {skeletons.map((k) => (
            <button key={k} lang="ar" className={`pick ${k === skel ? "on" : ""}`} onClick={() => { setSkel(k); setAbove(0); setBelow(0); }}>{k}</button>
          ))}
        </div>
        <DotsBoard skeleton={skel} above={above} below={below} setAbove={setAbove} setBelow={setBelow} lang="ar" shown={made} />
        <div className="labresult" lang="ar">{made ? <>{t("labBecame")}: <b>{made}</b></> : <>&nbsp;</>}</div>
        {made && <button className="btn secondary small" onClick={() => speak(ar.items.find((i) => i.id === made)?.say?.ar ?? made, "ar-SA")}>🔊</button>}
      </div>
    </>
  );
}
