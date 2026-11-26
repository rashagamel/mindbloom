"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Mascot, Confetti } from "./Visuals";
import BloomBreak from "./BloomBreak";
import { config, strings, content, sounds } from "@/lib/content";
import { BUILDERS, recordSound } from "@/lib/sounds";
import { breakDue } from "@/lib/wellbeing";
import { touchStreak } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// One shell for all four Sound Safari games. Mistakes are never punished:
// a wrong pick just fades out, Bloom says "oops is how we learn", and the child tries again.
// The Help button climbs a ladder: listen again -> remove a wrong choice -> point to the answer.
export default function SafariGame({ game }) {
  const { state, setState, ready, lang, t } = useApp();
  const meta = sounds.games.find((g) => g.id === game);
  const pack = sounds[lang] ?? sounds.en;
  const sl = strings[lang].speechLang;
  const dir = strings[lang].dir;
  const rounds = config.safari.rounds;

  const [round, setRound] = useState(null);
  const [no, setNo] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(0);
  const [removed, setRemoved] = useState(null);
  const [beats, setBeats] = useState(0);
  const [lit, setLit] = useState(-1);
  const [showParts, setShowParts] = useState(false);
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState("happy");
  const [finished, setFinished] = useState(false);
  const [breakWhy, setBreakWhy] = useState(null);
  const [results, setResults] = useState([]);

  const stateRef = useRef(state);
  const recent = useRef([]);
  const timers = useRef([]);
  const startedAt = useRef(Date.now());
  const lastBreak = useRef(0);
  useEffect(() => { stateRef.current = state; }, [state]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  // say a list of [text, litIndex] one after another, lighting each piece as it is spoken
  const seq = (items, gap = config.safari.blendGapMs) => {
    items.forEach(([text, i], idx) => later(() => { speak(text, sl); setLit(i); }, idx * gap));
    later(() => setLit(-1), items.length * gap);
  };

  const letterItem = (r) => content.domains.find((d) => d.id === pack.domain)?.items.find((i) => i.id === r.letter);

  const intro = (r) => {
    if (r.game === "rain") speak(r.target.say, sl);
    else if (r.game === "drums") speak(r.word.say, sl);
    else if (r.game === "hunt") speak(letterItem(r)?.sound ?? r.letter, sl);
    else if (r.game === "blend") seq(r.word.sayParts.map((p, i) => [p, i]));
  };

  const start = (n) => {
    clearTimers();
    const r = BUILDERS[game](pack, stateRef.current, { recent: recent.current });
    recent.current = [...recent.current, r.key].slice(-4);
    setRound(r); setNo(n); setWrong([]); setSolved(false); setHint(0); setRemoved(null);
    setBeats(0); setLit(-1); setShowParts(false); setMsg(""); setMood("happy");
    later(() => intro(r), 350);
  };

  useEffect(() => {
    if (ready && state.child && meta && !round) start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  if (!meta) return <p><Link href="/safari">{t("safariTitle")}</Link></p>;
  const sound = state.child.sound !== false;

  const finishRound = (extraDelay = 0) => {
    const first = wrong.length === 0 && hint < 2;
    const praise = t("good");
    setSolved(true); setMood("cheer"); setMsg(pick(praise));
    sfx("good", sound);
    setState((s) => recordSound(s, game, round.key, first, config));
    const all = [...results, first];
    setResults(all);
    later(() => {
      if (no + 1 >= rounds) {
        sfx("win", sound);
        setState((s) => touchStreak({ ...s, sessions: s.sessions + 1 }));
        setFinished(true);
        return;
      }
      const why = breakDue({ now: Date.now(), sessionStart: startedAt.current, lastBreak: lastBreak.current, recent: all, cfg: config.wellbeing });
      if (why) setBreakWhy(why); else start(no + 1);
    }, config.safari.nextDelayMs + extraDelay);
  };

  const oops = () => { sfx("soft", sound); setMood("think"); setMsg(pick(t("oops"))); };

  const choose = (c) => {
    if (solved || wrong.includes(c.k) || removed === c.k) return;
    speak(c.say, sl);
    if (c.k === round.answer.k) finishRound();
    else { setWrong((w) => [...w, c.k]); oops(); }
  };

  const checkBeats = () => {
    if (solved || beats === 0) return;
    if (beats === round.n) {
      setShowParts(true);
      seq(round.word.parts.map((p, i) => [p, i]), 700);
      finishRound(round.n * 700);
    } else {
      setWrong((w) => [...w, "x"]); setBeats(0); oops();
      later(() => speak(round.word.say, sl), 500);
    }
  };

  const askHint = () => {
    if (solved) return;
    const h = Math.min(hint + 1, 3);
    setHint(h);
    setMood("happy");
    if (game === "drums") {
      if (h === 1) { setMsg(t("hint1")); intro(round); }
      else if (h === 2) { setMsg(t("hintDrums2")); setShowParts(true); seq(round.word.parts.map((p, i) => [p, i]), 800); }
      else { setMsg(t("hintDrums3")); setBeats(round.n); }
      return;
    }
    if (h === 1) { setMsg(t("hint1")); intro(round); }
    else if (h === 2) {
      const gone = round.choices.find((c) => c.k !== round.answer.k && !wrong.includes(c.k));
      if (gone) setRemoved(gone.k);
      setMsg(t("hint2"));
    } else setMsg(t("hint3"));
  };

  if (finished) {
    return (
      <div className="card center">
        <Confetti />
        <Mascot mood="cheer" size={130} />
        <h1>{t("safariDone")}</h1>
        <p>⭐ {state.stars}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { setFinished(false); setResults([]); recent.current = []; startedAt.current = Date.now(); lastBreak.current = 0; start(0); }}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/safari">{t("safariTitle")}</Link>
        </div>
      </div>
    );
  }
  if (breakWhy) {
    return <BloomBreak reason={breakWhy} onDone={() => { lastBreak.current = Date.now(); setBreakWhy(null); start(no + 1); }} />;
  }
  if (!round) return null;

  const title = `${meta.icon} ${t(game === "rain" ? "safariRain" : game === "drums" ? "safariDrums" : game === "hunt" ? "safariHunt" : "safariBlend")}`;
  const ask = game === "rain" ? t("rainAsk", { word: round.target.text }) : t(game === "drums" ? "drumsAsk" : game === "hunt" ? "huntAsk" : "blendAsk");

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/safari"><span className="arr">←</span> {t("safariTitle")}</Link>
        <strong>{title}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <div className="dots" style={{ justifyContent: "center", marginBottom: 6 }} aria-label={t("safariRound", { i: no + 1, n: rounds })}>
        {Array.from({ length: rounds }, (_, i) => <span key={i} className={`dot ${i < no ? "done" : i === no ? "now" : ""}`} />)}
      </div>

      <div className="card center safari" dir={dir}>
        <div className="ask big">{ask}</div>

        {game === "rain" && (
          <div className="stagepic">
            <span className="sfemoji">{round.target.emoji}</span>
            <span className="bigword" lang={lang}>{round.target.text}</span>
            <button className="listen mini" aria-label="listen" onClick={() => speak(round.target.say, sl)}>🔊</button>
          </div>
        )}
        {game === "hunt" && (
          <div className="stagepic">
            <span className="bigword letterbubble" lang={lang}>{letterItem(round)?.label ?? round.letter}</span>
            <button className="listen mini" aria-label="listen" onClick={() => speak(letterItem(round)?.sound ?? round.letter, sl)}>🔊</button>
          </div>
        )}
        {game === "blend" && (
          <div className="stagepic">
            <span className="sfemoji" aria-hidden="true">🤖</span>
            <div className="pieces" lang={lang}>
              {round.word.parts.map((p, i) => <span key={i} className={`piece ${lit === i ? "on" : ""}`}>{p}</span>)}
            </div>
            <button className="btn secondary small" onClick={() => intro(round)}>🔊 {t("blendAgain")}</button>
          </div>
        )}
        {game === "drums" && (
          <div className="stagepic">
            <span className="sfemoji">{round.word.emoji}</span>
            <button className="listen mini" aria-label="listen" onClick={() => speak(round.word.say, sl)}>🔊</button>
            <button
              key={beats}
              className="drum"
              aria-label="drum"
              onClick={() => { if (solved) return; sfx("tap", sound); setBeats((b) => Math.min(b + 1, 8)); }}
            >🥁</button>
            <div className="beatrow" aria-label={t("drumsBeats", { n: beats })}>
              {Array.from({ length: beats }, (_, i) => <span key={i} className="beat" />)}
            </div>
            {showParts && (
              <div className="pieces" lang={lang}>
                {round.word.parts.map((p, i) => <span key={i} className={`piece ${lit === i ? "on" : ""}`}>{p}</span>)}
              </div>
            )}
            <div className="actions" style={{ justifyContent: "center", marginTop: 4 }}>
              <button className="btn" onClick={checkBeats} disabled={solved || beats === 0}>{t("drumsDone")}</button>
              <button className="btn secondary" onClick={() => setBeats(0)} disabled={solved || beats === 0}>{t("drumsClear")}</button>
            </div>
          </div>
        )}

        {game !== "drums" && (
          <div className="sfrow" dir={dir}>
            {round.choices.map((c, i) => (
              <button
                key={c.k}
                lang={lang}
                className={`sfpick ${game === "rain" ? "fall" : ""} ${wrong.includes(c.k) ? "dim" : ""} ${removed === c.k ? "gone" : ""} ${hint >= 3 && c.k === round.answer.k && !solved ? "glow" : ""} ${solved && c.k === round.answer.k ? "right" : ""}`}
                style={{ animationDelay: `${i * 0.35}s` }}
                onClick={() => choose(c)}
                disabled={removed === c.k}
              >
                <span className="e">{c.emoji}</span>
                {game !== "blend" && <span className="w">{c.text}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn secondary small" onClick={askHint} disabled={solved || hint >= 3}>💡 {t("hintBtn")}</button>
        </div>
      </div>

      <div className="feedback" aria-live="polite">
        <Mascot mood={mood} size={56} />
        <span>{msg}</span>
      </div>
    </>
  );
}
