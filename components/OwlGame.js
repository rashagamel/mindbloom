"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Mascot, Confetti } from "./Visuals";
import BloomBreak from "./BloomBreak";
import { config, strings, content, owl } from "@/lib/content";
import { BUILDERS, recordNumber, scoreLine, numLabel } from "@/lib/quantity";
import { breakDue } from "@/lib/wellbeing";
import { touchStreak, resolveText } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";

const cfg = config.owl;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const NAMES = { look: "owlLook", line: "owlLine", more: "owlMore" };
const numbers = content.domains.find((d) => d.id === "numbers");
const numSay = (n, lang) => resolveText(numbers.items.find((i) => i.id === String(n))?.say, lang);

// Dots in a square. `kind` draws the ten-frame grid behind the dots when needed.
function Dots({ pts, kind, counted = 0, lang }) {
  return (
    <div className={`dotfield ${kind}`}>
      {kind === "frame" && <div className="tenframe" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div>}
      {pts.map(([x, y], i) => (
        <span key={i} className={`qdot ${counted > i ? "counted" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>
          {counted > i ? numLabel(i + 1, lang) : ""}
        </span>
      ))}
    </div>
  );
}

// Three number-sense games. Same promises as Sound Safari: no red marks, a Help ladder, Bloom Breaks.
export default function OwlGame({ game }) {
  const { state, setState, ready, lang, t } = useApp();
  const meta = owl.games.find((g) => g.id === game);
  const sl = strings[lang].speechLang;
  const dir = strings[lang].dir;
  const rounds = cfg.rounds;

  const [round, setRound] = useState(null);
  const [no, setNo] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(0);
  const [phase, setPhase] = useState("ready"); // look: ready -> flash -> answer (or count)
  const [counted, setCounted] = useState(0);
  const [taps, setTaps] = useState([]); // line: where the child tapped
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState("happy");
  const [finished, setFinished] = useState(false);
  const [breakWhy, setBreakWhy] = useState(null);
  const [results, setResults] = useState([]);

  const stateRef = useRef(state);
  const recent = useRef([]);
  const timers = useRef([]);
  const lineRef = useRef(null);
  const startedAt = useRef(Date.now());
  const lastBreak = useRef(0);
  useEffect(() => { stateRef.current = state; }, [state]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const flash = (r, mult = 1) => {
    setPhase("flash");
    later(() => setPhase("answer"), r.flashMs * mult);
  };

  const start = (n) => {
    clearTimers();
    const r = BUILDERS[game](stateRef.current, cfg, { recent: recent.current, emoji: owl.emoji });
    recent.current = [...recent.current, r.key, r.emoji].filter(Boolean).slice(-2);
    setRound(r); setNo(n); setWrong([]); setSolved(false); setHint(0); setCounted(0); setTaps([]); setMsg(""); setMood("happy");
    if (game === "look") {
      setPhase("ready");
      later(() => flash(r), cfg.readyMs);
    } else {
      setPhase("answer");
      later(() => (game === "line" ? speak(numSay(r.n, lang), sl) : speak(t("owlMoreAsk"), sl)), 350);
    }
  };

  useEffect(() => {
    if (ready && state.child && meta && !round) start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  if (!meta) return <p><Link href="/owl">{t("owlTitle")}</Link></p>;
  const sound = state.child.sound !== false;

  const finishRound = () => {
    const first = wrong.length === 0 && hint < 2;
    setSolved(true); setMood("cheer"); setMsg(pick(t("good")));
    if (game === "look") { setPhase("count"); setCounted(round.n); }
    sfx("good", sound);
    setState((s) => recordNumber(s, game, round.key, first, cfg));
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
    }, cfg.nextDelayMs);
  };

  const oops = (extra = "") => { sfx("soft", sound); setMood("think"); setMsg(`${pick(t("oops"))} ${extra}`.trim()); };

  // look: tap a number
  const chooseNumber = (n) => {
    if (solved || wrong.includes(n) || phase === "flash" || phase === "ready") return;
    speak(numSay(n, lang), sl);
    if (n === round.n) finishRound(); else { setWrong((w) => [...w, n]); oops(); }
  };

  // line: tap the line
  const tapAt = (x) => {
    if (solved) return;
    const sc = scoreLine(round, x, cfg);
    setTaps((tp) => [...tp, { x, ok: sc.ok }]);
    if (sc.ok) finishRound();
    else { setWrong((w) => [...w, "x"]); oops(t(sc.dir === "bigger" ? "owlLineBigger" : "owlLineSmaller")); }
  };
  const onLine = (e) => {
    const r = lineRef.current.getBoundingClientRect();
    tapAt(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  // more: tap a group
  const chooseGroup = (i) => {
    if (solved || wrong.includes(i)) return;
    if (i === round.answer) finishRound(); else { setWrong((w) => [...w, i]); oops(); }
  };

  const askHint = () => {
    if (solved) return;
    const h = Math.min(hint + 1, 3);
    setHint(h); setMood("happy");
    if (game === "look") {
      if (h === 1) { setMsg(t("owlLookAgain")); flash(round, 2); }
      else if (h === 2) {
        setMsg(t("owlHintCount")); setPhase("count"); setCounted(0);
        for (let i = 1; i <= round.n; i++) later(() => { setCounted(i); speak(numSay(i, lang), sl); }, i * 650);
      } else setMsg(t("hint3"));
    } else if (game === "line") {
      if (h === 1) { setMsg(t("owlHintMid")); speak(numSay(round.n, lang), sl); }
      else if (h === 2) setMsg(t("owlHintTicks"));
      else setMsg(t("hint3"));
    } else {
      setMsg(t(h === 1 ? "owlHintRows" : h === 2 ? "owlHintCounts" : "hint3"));
    }
  };

  if (finished) {
    return (
      <div className="card center">
        <Confetti />
        <div className="sfemoji">🦉</div>
        <h1>{t("owlDone")}</h1>
        <p>⭐ {state.stars}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => { setFinished(false); setResults([]); recent.current = []; startedAt.current = Date.now(); lastBreak.current = 0; start(0); }}>{t("playAgain")}</button>
          <Link className="btn secondary" href="/owl">{t("owlTitle")}</Link>
        </div>
      </div>
    );
  }
  if (breakWhy) return <BloomBreak reason={breakWhy} onDone={() => { lastBreak.current = Date.now(); setBreakWhy(null); start(no + 1); }} />;
  if (!round) return null;

  const dotsVisible = phase === "flash" || phase === "count" || solved;
  const choicesVisible = phase === "answer" || phase === "count";
  const midTick = Math.round((round.max ?? 10) / 2);

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/owl"><span className="arr">←</span> {t("owlTitle")}</Link>
        <strong>{meta.icon} {t(NAMES[game])}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <div className="dots" style={{ justifyContent: "center", marginBottom: 6 }} aria-label={t("safariRound", { i: no + 1, n: rounds })}>
        {Array.from({ length: rounds }, (_, i) => <span key={i} className={`dot ${i < no ? "done" : i === no ? "now" : ""}`} />)}
      </div>

      <div className="card center safari" dir={dir}>
        <div className="ask big">
          {game === "look" && (phase === "ready" ? t("owlGetReady") : t("owlLookAsk"))}
          {game === "line" && <>{t("owlLineAsk", { n: numLabel(round.n, lang) })}<button className="listen mini" aria-label="listen" onClick={() => speak(numSay(round.n, lang), sl)}>🔊</button></>}
          {game === "more" && t("owlMoreAsk")}
        </div>

        {game === "look" && (
          <>
            <div className="stagepic">
              {dotsVisible
                ? <Dots pts={round.layout.pts} kind={round.layout.kind} counted={phase === "count" ? counted : 0} lang={lang} />
                : <div className="dotfield hidden"><span className="owlcover">🦉</span></div>}
            </div>
            <div className="sfrow" style={{ visibility: choicesVisible ? "visible" : "hidden" }}>
              {round.choices.map((n) => (
                <button
                  key={n}
                  className={`sfpick numpick ${wrong.includes(n) ? "dim" : ""} ${hint >= 3 && n === round.n && !solved ? "glow" : ""} ${solved && n === round.n ? "right" : ""}`}
                  onClick={() => chooseNumber(n)}
                >
                  <span className="w big">{numLabel(n, lang)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {game === "line" && (
          <div className="numlinewrap" dir="ltr">
            <div className="numline" ref={lineRef} onClick={onLine} role="button" aria-label={t("owlLineAsk", { n: numLabel(round.n, lang) })}>
              <div className="track" />
              <span className="endlabel" style={{ left: "0%" }}>{numLabel(0, lang)}</span>
              <span className="endlabel" style={{ left: "100%" }}>{numLabel(round.max, lang)}</span>
              {hint >= 1 && hint < 2 && [midTick].map((v) => <span key={v} className="nltick" style={{ left: `${(v / round.max) * 100}%` }}><b>{numLabel(v, lang)}</b></span>)}
              {hint >= 2 && Array.from({ length: round.max - 1 }, (_, i) => i + 1).map((v) => (
                <button key={v} className="nltick" style={{ left: `${(v / round.max) * 100}%` }} onClick={(e) => { e.stopPropagation(); tapAt(v / round.max); }}><b>{numLabel(v, lang)}</b></button>
              ))}
              {taps.filter((tp) => !tp.ok).map((tp, i) => <span key={i} className="marker miss" style={{ left: `${tp.x * 100}%` }}>•</span>)}
              {hint >= 3 && !solved && <span className="glowspot" style={{ left: `${(round.n / round.max) * 100}%` }} />}
              {solved && <span className="owlpin" style={{ left: `${(round.n / round.max) * 100}%` }}>🦉</span>}
            </div>
          </div>
        )}

        {game === "more" && (
          <div className="tribes">
            {round.groups.map((g, i) => {
              const pts = hint >= 1 ? g.rows : g.pts;
              return (
                <button
                  key={i}
                  className={`tribe ${wrong.includes(i) ? "dim" : ""} ${hint >= 3 && i === round.answer && !solved ? "glow" : ""} ${solved && i === round.answer ? "right" : ""}`}
                  onClick={() => chooseGroup(i)}
                >
                  <div className="dotfield">
                    {pts.map(([x, y], j) => <span key={j} className="qemoji" style={{ left: `${x}%`, top: `${y}%` }}>{round.emoji}</span>)}
                  </div>
                  {(hint >= 2 || solved) && <b className="tribecount">{numLabel(g.count, lang)}</b>}
                </button>
              );
            })}
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
