"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import Session from "./Session";
import MeetCards from "./MeetCards";
import { Confetti, Flower, Mascot } from "./Visuals";
import { config, findDomain, worldOf } from "@/lib/content";
import {
  buildLevelQuestion, completeLevel, isLevelUnlocked, levelContext, levelStars, findMissions, resolveText,
} from "@/lib/engine";
import { sfx } from "@/lib/sfx";

export default function LevelRunner({ domainId, levelId }) {
  const { state, setState, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const world = worldOf(domainId);
  const index = world?.levels.findIndex((l) => l.id === levelId) ?? -1;
  const [stage, setStage] = useState("meet");
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);

  if (!ready) return null;
  if (!domain || !world || index < 0) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const level = world.levels[index];
  const mapHref = `/world/${domainId}`;

  if (stage !== "done" && !result && !isLevelUnlocked(world, index, state, config)) {
    return (
      <div className="card center">
        <div className="bigemoji">🔒</div>
        <p>{t("needStars")}</p>
        <Link className="btn" href={mapHref}>{t("backToMap")}</Link>
      </div>
    );
  }

  const ctx = levelContext(world, index);
  const title = `${level.icon} ${resolveText(level.title, lang)}`;

  if (stage === "meet") {
    return (
      <>
        <div className="topbar">
          <Link className="link" href={mapHref}><span className="arr">←</span> {t("backToMap")}</Link>
          <strong>{title}</strong>
          <span className="stars">⭐ {state.stars}</span>
        </div>
        <div className="stagebar"><b>1 · {t("stageMeet")}</b><span>2 · {t("stageGame")}</span></div>
        <MeetCards domainId={domainId} ids={level.items} onDone={() => setStage("play")} />
      </>
    );
  }

  if (stage === "play") {
    return (
      <Session
        key={round}
        domain={domain}
        total={config.levels.questions}
        title={title}
        backHref={mapHref}
        flowerColor={level.color}
        makeQuestion={(s, recent) => buildLevelQuestion(domain, ctx, s, config, { recent })}
        onComplete={({ correct, total }) => {
          const stars = levelStars(correct, total, config);
          setState((s) => completeLevel(s, world, level, stars, config));
          setResult({ correct, total, stars });
          setStage("done");
          sfx(stars ? "win" : "soft", state.child.sound !== false);
        }}
      />
    );
  }

  const next = world.levels[index + 1];
  const won = result.stars >= config.levels.minStarsToUnlock;
  const mission = findMissions(state, { domains: [domain] }, config)[0];
  return (
    <div className="card center">
      {result.stars > 0 && <Confetti />}
      <Mascot mood={won ? "cheer" : "think"} size={96} />
      <h1>{won ? t("levelComplete") : t("levelRetry")}</h1>
      <div className="starrow" aria-label={`${result.stars} / 3`}>
        {[1, 2, 3].map((n) => <span key={n} className={n <= result.stars ? "on" : ""}>⭐</span>)}
      </div>
      <p>{result.correct} / {result.total}</p>
      {won && (
        <div className="sticker"><div className="stickeremoji">{level.sticker}</div><div>{t("newSticker")}</div></div>
      )}
      <Flower stage={won ? 3 + result.stars - 1 : 1} size={100} color={level.color} />
      {mission && (
        <div className="callout">
          🕵️ {t("missionBody", { a: mission.ids[0], b: mission.ids[1] })}
          <div><Link className="btn small" href={`/twins/${domainId}/${mission.groupIndex}`}>{t("missionGo")}</Link></div>
        </div>
      )}
      <div className="actions" style={{ justifyContent: "center" }}>
        {won && next && <Link className="btn" href={`/level/${domainId}/${next.id}`}>{t("levelNext")} <span className="arr">→</span></Link>}
        <button className="btn secondary" onClick={() => { setResult(null); setRound((r) => r + 1); setStage("play"); }}>{t("playAgain")}</button>
        <Link className="btn secondary" href={mapHref}>{t("backToMap")}</Link>
      </div>
    </div>
  );
}
