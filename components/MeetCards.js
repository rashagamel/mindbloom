"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { findDomain, itemLabel, domainLang, domainSpeechLang, domainDir, hintOf, pictureOf } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { speak, speakBoth, preload } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import { Pic } from "./Visuals";
import ItemFace from "./ItemFace";

// One card per item, in clear sections: look and listen -> a word -> things around you -> how to remember.
// Everything on the card can be tapped; tapped things get a tick.
export default function MeetCards({ domainId, ids, onDone, doneLabel }) {
  const { state, lang, t } = useApp();
  const domain = findDomain(domainId);
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState({}); // "<card>:<what>" -> true
  const [pulse, setPulse] = useState(null); // what is animating now
  const timer = useRef(null);
  const sound = state.child?.sound !== false;

  const id = ids[i];
  const item = domain.items.find((x) => x.id === id);
  const cl = domainLang(domain, lang);
  const sl = domainSpeechLang(domain, lang);
  const pic = pictureOf(domain, item);
  const hint = hintOf(domainId, id, lang);
  const name = resolveText(item.say, cl);
  const phoneme = resolveText(item.sound, cl);
  const audio = resolveText(item.audio, cl);

  const mark = (what) => {
    setHeard((h) => ({ ...h, [`${i}:${what}`]: true }));
    setPulse(what);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulse(null), 700);
    sfx("tap", sound);
  };
  const enLetters = domainId === "en-letters"; // exact letter pronunciation on the cloud voice
  const sayName = () => { mark("name"); speak(name, sl, audio, enLetters ? { kind: "name" } : {}); };
  const saySound = () => { mark("sound"); speak(phoneme, sl, undefined, { rate: 0.6, kind: enLetters ? "sound" : "" }); };
  const sayBoth = () => { mark("name"); mark("sound"); speakBoth(name, phoneme, sl, { audioName: audio, kinds: enLetters }); };

  // Read the name when a new card appears.
  useEffect(() => {
    const id0 = setTimeout(() => speak(name, sl, audio, enLetters ? { kind: "name" } : {}), 350);
    return () => { clearTimeout(id0); clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const tick = (what) => (heard[`${i}:${what}`] ? <span className="tick" aria-hidden="true">✓</span> : null);
  const cls = (what) => (pulse === what ? " pulse" : "");
  const isShape = domain.kind === "shape";
  const isNum = !!domain.countEmoji;

  // Download this screen's voices ahead of time so every tap answers at once.
  useEffect(() => {
    const list = ids.flatMap((x) => {
      const it = domain.items.find((y) => y.id === x);
      const w = pictureOf(domain, it);
      return [{ text: resolveText(it.say, cl), kind: enLetters ? "name" : "" }, { text: resolveText(it.sound, cl), kind: enLetters ? "sound" : "", slow: true }, w?.say && { text: w.say }];
    });
    preload(list, sl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId]);

  return (
    <div className="meet">
      <div className="meetdots" role="tablist" aria-label={`${i + 1} / ${ids.length}`}>
        {ids.map((x, k) => (
          <button key={x} role="tab" aria-selected={k === i} className={`mdot ${k === i ? "now" : k < i ? "past" : ""}`} onClick={() => setI(k)} aria-label={`${k + 1}`} />
        ))}
        <span className="muted small">{i + 1} / {ids.length}</span>
      </div>

      <section className="msec" key={`look-${i}`}>
        <h3>👀 {t("secLook")}</h3>
        <button className={`bigletter${cls("name")}`} onClick={sayBoth} lang={cl} dir={domainDir(domain, lang)} aria-label={itemLabel(domain, id, cl)}>
          <ItemFace domain={domain} id={id} lang={cl} size={150} />
          {tick("name")}
        </button>
        {isShape && <div className="shapename" lang={cl}>{itemLabel(domain, id, cl)}</div>}
        {item.fact && <p className="muted">{resolveText(item.fact, lang)}</p>}
        <div className="soundpills">
          <button className={`pill btnsound${cls("name")}`} onClick={sayName}>🔊 {t(isNum ? "numSay" : "letterName")}{tick("name")}</button>
          {phoneme && <button className={`pill btnsound${cls("sound")}`} onClick={saySound}>🎵 {t("letterSound")}{tick("sound")}</button>}
        </div>
        <p className="muted small">{t(isNum ? "tapToHearNum" : "tapToHear")}</p>
      </section>

      {pic && !isNum && (
        <section className="msec">
          <h3>🖼️ {t("secWord")}</h3>
          <button className={`meetpic wordcard${cls("word")}`} onClick={() => { mark("word"); speak(pic.say, sl, pic.audio); }} lang={cl}>
            <Pic pic={pic} size="4.5rem" alt={pic.text ?? ""} />
            {pic.text && <span className="wordbtn">{pic.text} 🔊{tick("word")}</span>}
          </button>
        </section>
      )}

      {pic && isNum && (
        <section className="msec">
          <h3>🧮 {t("secCount")}</h3>
          <button className={`meetpic wordcard${cls("word")}`} onClick={() => { mark("word"); speak(name, sl, audio); }} lang={cl}>
            <span className="countpic" aria-hidden="true">{pic.emoji}</span>
            <span className="wordbtn">{name} 🔊{tick("word")}</span>
          </button>
        </section>
      )}

      {domain.examples?.[id] && (
        <section className="msec">
          <h3>🔎 {t("secAround")}</h3>
          <div className="exrow">
            {domain.examples[id].slice(0, 4).map((e) => (
              <button key={e.emoji} className={`ex${cls("ex" + e.emoji)}`} onClick={() => { mark("ex" + e.emoji); speak(resolveText(e.text, cl), sl); }}>
                <span className="exe">{e.emoji}</span><small>{resolveText(e.text, lang)}</small>{tick("ex" + e.emoji)}
              </button>
            ))}
          </div>
        </section>
      )}

      {hint && (
        <section className="msec">
          <h3>💡 {t("secRemember")}</h3>
          <div className="hint"><span className="hintemoji">{hint.emoji}</span><span>{hint.text}</span></div>
        </section>
      )}

      <div className="actions" style={{ justifyContent: "center" }}>
        {i > 0 && <button className="btn secondary" onClick={() => setI(i - 1)}><span className="arr">←</span> {t("prevCard")}</button>}
        {i + 1 < ids.length ? (
          <button className="btn" onClick={() => setI(i + 1)}>{t("nextCard")} <span className="arr">→</span></button>
        ) : (
          <button className="btn" onClick={onDone}>{doneLabel ?? t("startPlay")} <span className="arr">▶</span></button>
        )}
      </div>
    </div>
  );
}
