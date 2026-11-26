"use client";
import { useState } from "react";
import { config, findItem } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";

// Number Bakery: tap the jar to put cookies on the tray. Each cookie is counted out loud,
// so the child hears one-to-one counting and that the LAST number said is "how many".
export default function Bakery({ q, domain, lang, locked, onSubmit, t, sound }) {
  const [n, setN] = useState(0);
  const max = config.bakery.maxCookies;
  const say = (count) => {
    const it = domain.items.find((i) => i.n === count);
    if (it) speak(resolveText(it.say, lang), lang === "ar" ? "ar-SA" : "en-US", resolveText(it.audio, lang));
  };
  const add = () => {
    if (locked || n >= max) return;
    sfx("tap", sound);
    setN(n + 1);
    say(n + 1);
  };
  const remove = () => { if (!locked && n > 0) { setN(n - 1); sfx("soft", sound); } };
  const check = () => {
    if (locked || n === 0) return;
    const hit = domain.items.find((i) => i.n === n);
    onSubmit(n === q.count, hit?.id ?? null);
  };

  return (
    <div className="card center bakery">
      <button className="jar" onClick={add} disabled={locked} aria-label={t("bakeJar")}>
        <span className="jarcookie">🍪</span>
        <span className="jarplus">＋</span>
      </button>
      <div className={`tray ${locked && n === q.count ? "glow" : ""}`} dir="ltr">
        {Array.from({ length: n }, (_, i) => (
          <button key={i} className="cookie" onClick={remove} disabled={locked} aria-label="cookie">🍪</button>
        ))}
        {n === 0 && <span className="trayhint">🍽️</span>}
      </div>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={check} disabled={locked || n === 0}>✓ {t("bakeCheck")}</button>
        <button className="btn secondary" onClick={() => setN(0)} disabled={locked || n === 0}>↺ {t("bakeClear")}</button>
      </div>
    </div>
  );
}
