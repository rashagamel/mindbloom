"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { config, library } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { speak } from "@/lib/speech";
import { youtubeId } from "@/lib/youtube";

function Video({ item, onFinish }) {
  const { lang, t } = useApp();
  const [play, setPlay] = useState(false);
  const vid = youtubeId(item.youtube);
  if (!vid) return <p>Invalid video link.</p>;
  return (
    <>
      <div className="video">
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1&autoplay=1`}
            title={resolveText(item.title, lang)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button className="videobtn" onClick={() => setPlay(true)}>
            <span className="bigemoji">▶️</span>
            <span>{t("videoPlay")}</span>
          </button>
        )}
      </div>
      {item.credit && <p className="muted center">{t("videoBy", { name: item.credit })}</p>}
      <p className="muted center">{t("videoNote")}</p>
      <p className="center"><a className="link" href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer">{t("videoOpen")}</a></p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={onFinish}>{t("finish")}</button>
      </div>
    </>
  );
}

export default function Reader({ id }) {
  const { state, setState, ready, lang, t } = useApp();
  const item = library.items.find((i) => i.id === id);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const line = item?.lines?.[i];

  useEffect(() => {
    if (!ready || !line || done || !config.library.autoSpeak) return;
    const timer = setTimeout(() => speak(line.text, item.speechLang), 250);
    return () => clearTimeout(timer);
  }, [ready, i, done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!item) return <p>Not found. <Link href="/library">{t("library")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;

  const last = !item.lines || i === item.lines.length - 1;
  const finishItem = () => {
    setState((s) => ({ ...s, stars: s.stars + config.library.starsPerItem }));
    setDone(true);
  };
  const next = () => (last ? finishItem() : setI(i + 1));

  if (done) {
    return (
      <div className="card center">
        <div className="bigemoji">🌟</div>
        <h1>{t("libraryDone", { name: state.child.name })}</h1>
        <p>{t("starsEarned", { n: config.library.starsPerItem })}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/library">{t("library")}</Link>
          <Link className="btn secondary" href="/">{t("home")}</Link>
        </div>
      </div>
    );
  }

  if (item.youtube) {
    return (
      <>
        <div className="topbar">
          <Link className="link" href="/library"><span className="arr">←</span> {t("library")}</Link>
          <strong>{resolveText(item.title, lang)}</strong>
          <span />
        </div>
        <Video item={item} onFinish={finishItem} />
      </>
    );
  }

  const speaker = line.speaker ? item.speakers?.[line.speaker] : null;
  const side = line.speaker ? Object.keys(item.speakers).indexOf(line.speaker) : 0;

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/library"><span className="arr">←</span> {t("library")}</Link>
        <strong>{resolveText(item.title, lang)}</strong>
        <span className="muted">{t("pageOf", { i: i + 1, n: item.lines.length })}</span>
      </div>
      <div className="card reader" dir={item.dir} lang={item.lang}>
        {speaker && (
          <p className="speaker" style={{ textAlign: side % 2 ? "end" : "start" }}>
            {speaker.emoji} {resolveText(speaker.name, lang)}
          </p>
        )}
        {line.emoji && <div className="bigemoji center" dir="ltr">{line.emoji}</div>}
        <p className="line">{line.text}</p>
        <div className="center">
          <button className="listen" onClick={() => speak(line.text, item.speechLang)} aria-label={t("listenAgain")}>🔊</button>
        </div>
      </div>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <button className="btn secondary" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>{t("previous")}</button>
        <button className="btn" onClick={next}>{last ? t("finish") : t("next")}</button>
      </div>
    </>
  );
}
