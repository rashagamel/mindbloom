"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { config, findItem, domainLang, domainSpeechLang, domainDir, strings } from "@/lib/content";
import { recordAnswer, resolveText, touchStreak, recoveryTarget, buildRecoveryQuestion, buildRecheckQuestion } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import QuestionView from "./QuestionView";
import { Mascot, Flower } from "./Visuals";
import BloomBreak from "./BloomBreak";
import { breakDue } from "@/lib/wellbeing";

// Runs `total` questions made by makeQuestion(state, recent) and reports back through onComplete.
// Used by free practice, levels and twin missions, so they all feel the same.
export default function Session({ domain, total, makeQuestion, onComplete, title, backHref, flowerColor, quiet = false }) {
  const { state, setState, lang, t } = useApp();
  const sound = state.child?.sound !== false;
  const [q, setQ] = useState(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("happy");
  const [results, setResults] = useState([]);
  const [breakWhy, setBreakWhy] = useState(null); // "time" | "misses" while a Bloom Break is showing

  const stateRef = useRef(state);
  const recent = useRef([]);
  const startedAt = useRef(Date.now());
  const timer = useRef(null);
  const resultsRef = useRef([]);
  const recheckAt = useRef(null); // { target, at } after a recovery step that went well
  const answersRef = useRef([]);
  const sessionStart = useRef(Date.now());
  const lastBreak = useRef(0);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const contentLang = domainLang(domain, lang);
  const speechLang = domainSpeechLang(domain, lang);
  const dir = domainDir(domain, lang);
  const sayOf = (id) => resolveText(findItem(domain, id)?.say, contentLang);
  const spk = (id) => speak(sayOf(id), speechLang, audioOf(id), domain.id === "en-letters" ? { kind: "name" } : {});
  const audioOf = (id) => resolveText(findItem(domain, id)?.audio, contentLang);

  const listen = (question) => {
    if (!question) return;
    if (question.type === "missing" || question.type === "build") speak(question.word.say, speechLang, question.word.audio);
    else if (question.type === "example") speak(resolveText(question.example.text, contentLang), speechLang);
    else if (question.type === "count" || question.type === "hop") speak(t("askCount"), strings[lang].speechLang);
    else spk(question.target);
  };

  const next = () => {
    const done = resultsRef.current.length;
    let nq;
    const help = quiet ? null : recoveryTarget(answersRef.current);
    if (help != null) {
      nq = buildRecoveryQuestion(domain, stateRef.current, config, help);
    } else if (!quiet && recheckAt.current && done >= recheckAt.current.at) {
      nq = buildRecheckQuestion(domain, stateRef.current, config, recheckAt.current.target);
      recheckAt.current = null;
    } else nq = makeQuestion(stateRef.current, recent.current, done);
    recent.current = [...recent.current, nq.target].slice(-6);
    startedAt.current = Date.now();
    setPicked(null);
    setMessage(nq.recovery ? t("recoveryHint") : "");
    setMood("happy");
    setQ(nq);
    setTimeout(() => listen(nq), 250);
  };

  useEffect(() => {
    if (!q) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (correct, chosen) => {
    if (picked != null || !q) return;
    const trace = q.type === "trace";
    setPicked(chosen ?? "done");
    resultsRef.current = [...resultsRef.current, correct];
    answersRef.current = [...answersRef.current, { target: q.target, chosen: correct ? q.target : chosen, correct, recovery: !!q.recovery }];
    if (q.recovery && correct && total - resultsRef.current.length > 2) recheckAt.current = { target: q.target, at: resultsRef.current.length + 2 };
    setResults(resultsRef.current);
    setState((s) =>
      recordAnswer(s, domain, { target: q.target, chosen: correct ? q.target : chosen, correct, ms: Date.now() - startedAt.current, type: q.type, rec: q.recovery ? 1 : q.recheck ? 2 : 0 }, config)
    );
    sfx(quiet ? "tap" : correct ? "good" : "soft", sound);
    setMood(correct ? "cheer" : "think");
    if (quiet) {
      setMessage("👍");
    } else if (correct) {
      const praise = t("good");
      setMessage(praise[Math.floor(Math.random() * praise.length)]);
    } else {
      const oops = t("oops");
      setMessage(trace ? t("traceAgain") : oops[Math.floor(Math.random() * oops.length)]);
      if (!trace && q.type !== "build" && q.type !== "parts" && q.type !== "dots") spk(q.target);
    }
    timer.current = setTimeout(() => {
      if (resultsRef.current.length >= total) {
        const correctN = resultsRef.current.filter(Boolean).length;
        setState((s) => touchStreak({ ...s, sessions: s.sessions + 1 }));
        onComplete({ correct: correctN, total, answers: answersRef.current });
      } else {
        setIndex((i) => i + 1);
        // Offer a Bloom Break between questions after a long stretch or several misses in a row.
        const why = quiet ? null : breakDue({ now: Date.now(), sessionStart: sessionStart.current, lastBreak: lastBreak.current, recent: resultsRef.current, cfg: config.wellbeing });
        if (why) setBreakWhy(why); else next();
      }
    }, config.session.feedbackDelayMs);
  };

  if (!q) return null;
  if (breakWhy) {
    return <BloomBreak reason={breakWhy} onDone={() => { lastBreak.current = Date.now(); setBreakWhy(null); next(); }} />;
  }
  const grown = Math.min(5, Math.floor((results.filter(Boolean).length / total) * 5 + 0.0001));

  return (
    <>
      <div className="topbar">
        <Link className="link" href={backHref}><span className="arr">←</span> {t("home")}</Link>
        <strong>{title}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <div className="progressrow">
        <div className="dots" aria-label={t("question", { i: index + 1, n: total })}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`dot ${i < results.length ? (quiet || results[i] ? "done" : "miss") : i === index ? "now" : ""}`} />
          ))}
        </div>
        {!quiet && <Flower key={grown} stage={grown} size={64} color={flowerColor} />}
      </div>
      <QuestionView
        q={q} domain={domain} contentLang={contentLang} dir={dir} picked={picked}
        onSubmit={submit} listen={() => listen(q)} t={t} sound={sound} quiet={quiet}
      />
      <div className="feedback" aria-live="polite">
        <Mascot mood={picked == null ? "happy" : mood} size={56} />
        <span>{message}</span>
      </div>
    </>
  );
}
