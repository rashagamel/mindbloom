"use client";
import { useState } from "react";
import { itemLabel, pictureOf } from "@/lib/content";
import { DotsGame, PartsGame, Hop } from "./ShapeGames";
import ItemFace from "./ItemFace";
import Bakery from "./Bakery";
import { Pic } from "./Visuals";
import { sfx } from "@/lib/sfx";
import Trace from "./Trace";

// Draws one question. Calls onSubmit(correct, chosenId) exactly once.
export default function QuestionView({ q, domain, contentLang, dir, picked, onSubmit, listen, t, sound, quiet = false }) {
  const label = (id) => itemLabel(domain, id, contentLang);
  const domainAsk = domain.asks?.[q.type] ?? (q.type === "sound" ? domain.asks?.sound : null);
  const ask = domainAsk ? t(domainAsk) : { missing: t("askMissing"), count: t("askCount"), trace: t("askTrace"), build: t("askBuild"), parts: t("askParts"), dots: t("askDots"), hop: t("askHop"), bake: t("askBake") }[q.type] ??
    (q.style === "pop" ? t("askPop") : t("askSound"));

  return (
    <>
      <div className="card prompt">
        <p className="ask">{ask}</p>
        {q.type === "missing" && (
          <>
            <Pic pic={{ emoji: q.word.emoji, image: q.word.image }} size="4.5rem" />
            <div className="word" dir={dir} lang={contentLang}>
              {q.word.chars.map((c, i) => (i === q.word.blankIndex ? "＿" : c)).join("")}
            </div>
          </>
        )}
        {q.type === "build" && <Pic pic={{ emoji: q.word.emoji, image: q.word.image }} size="4.5rem" />}
        {(q.type === "parts" || q.type === "dots") && <Pic pic={pictureOf(domain, domain.items.find((i) => i.id === q.target))} size="4rem" />}
        {q.type === "example" && (
          <div className="examplecard">
            <span className="exampleemoji">{q.example.emoji}</span>
            <b>{typeof q.example.text === "object" ? q.example.text[contentLang] ?? Object.values(q.example.text)[0] : q.example.text}</b>
          </div>
        )}
        {q.type === "bake" && <div className="bakenum" lang={contentLang}>{label(q.target)}</div>}
        {q.type === "count" && <div className="emojis">{Array(q.count).fill(q.emoji).join(" ")}</div>}
        <button className="listen" onClick={listen} aria-label={t("listenAgain")}>🔊</button>
      </div>

      {q.type === "trace" && (
        <Trace key={q.id} text={label(q.target)} lang={contentLang} locked={picked != null} onDone={(ok) => onSubmit(ok, null)} />
      )}
      {q.type === "parts" && <PartsGame key={q.id} q={q} domain={domain} locked={picked != null} onSubmit={onSubmit} t={t} sound={sound} />}
      {q.type === "dots" && <DotsGame key={q.id} q={q} domain={domain} lang={contentLang} locked={picked != null} onSubmit={onSubmit} t={t} sound={sound} />}
      {q.type === "bake" && <Bakery key={q.id} q={q} domain={domain} lang={contentLang} locked={picked != null} onSubmit={onSubmit} t={t} sound={sound} />}
      {q.type === "hop" && <Hop key={q.id} n={q.count} sound={sound} t={t} />}
      {q.type === "build" && <Build key={q.id} q={q} dir={dir} lang={contentLang} locked={picked != null} onSubmit={onSubmit} t={t} sound={sound} />}
      {(q.type === "sound" || q.type === "missing" || q.type === "count" || q.type === "hop" || q.type === "example") && (
        <div className={q.style === "pop" ? "bubbles" : "choices"} dir={dir}>
          {q.choices.map((id, i) => {
            let cls = q.style === "pop" ? "bubble" : "choice";
            if (picked != null && quiet) {
              if (id === picked) cls += " picked";
            } else if (picked != null) {
              if (id === q.target) cls += " good";
              else if (id === picked) cls += " soft";
            }
            return (
              <button
                key={id}
                className={cls}
                style={q.style === "pop" ? { animationDelay: `${i * 0.35}s` } : undefined}
                lang={contentLang}
                onClick={() => onSubmit(id === q.target, id)}
                disabled={picked != null}
              >
                <ItemFace domain={domain} id={id} lang={contentLang} size={q.style === "pop" ? 80 : 96} />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// Tap the letter tiles in order to spell the word.
function Build({ q, dir, lang, locked, onSubmit, t, sound }) {
  const [placed, setPlaced] = useState([]);
  const [shake, setShake] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const chars = q.word.chars;

  const tap = (tile) => {
    if (locked || placed.includes(tile.k)) return;
    if (tile.ch === chars[placed.length]) {
      sfx("tap", sound);
      const next = [...placed, tile.k];
      setPlaced(next);
      if (next.length === chars.length) onSubmit(mistakes === 0, null);
    } else {
      sfx("soft", sound);
      setMistakes((m) => m + 1);
      setShake(tile.k);
      setTimeout(() => setShake(null), 400);
    }
  };

  return (
    <div className="build">
      <div className="slots" dir={dir} lang={lang} aria-label={t("tapLetters")}>
        {chars.map((c, i) => (
          <span key={i} className={`slot ${i < placed.length ? "full" : ""}`}>{i < placed.length ? c : ""}</span>
        ))}
      </div>
      <div className="tiles" dir={dir} lang={lang}>
        {q.tiles.map((tile) => (
          <button
            key={tile.k}
            className={`tile-btn ${placed.includes(tile.k) ? "used" : ""} ${shake === tile.k ? "shake" : ""}`}
            onClick={() => tap(tile)}
            disabled={placed.includes(tile.k)}
          >
            {tile.ch}
          </button>
        ))}
      </div>
      <p className="muted center">{t("tapLetters")}</p>
    </div>
  );
}
