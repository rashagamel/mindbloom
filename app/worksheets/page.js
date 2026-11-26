"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { content, config, vocab, strings, pictureOf, itemLabel, domainDir } from "@/lib/content";
import { resolveText } from "@/lib/engine";
import { activitiesFor, buildWorksheet } from "@/lib/worksheets";
import ItemFace, { ShapeSvg } from "@/components/ItemFace";

const ACT_KEY = { trace: "wsTrace", circle: "wsCircle", match: "wsMatch", count: "wsCount" };
const HOW_KEY = { trace: "wsTraceHow", circle: "wsCircleHow", match: "wsMatchHow", count: "wsCountHow" };
const LETTERS = ["a", "b", "c", "d", "e", "f"];
const LETTERS_AR = ["أ", "ب", "ج", "د", "هـ", "و"];

export default function Worksheets() {
  const { ready, state, lang, t } = useApp();
  const [topic, setTopic] = useState("ar-letters");
  const [activity, setActivity] = useState("trace");
  const [seed, setSeed] = useState(0);
  const [key, setKey] = useState(false);

  const acts = activitiesFor(topic, content);
  const act = acts.includes(activity) ? activity : acts[0];
  const sheet = useMemo(
    () => ready && buildWorksheet({ topic, activity: act, content, vocab, state, config, lang, pictureOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, topic, act, seed, lang]
  );
  if (!ready || !sheet) return null;

  const domain = content.domains.find((d) => d.id === topic);
  const dir = domain ? domainDir(domain, lang) : strings[lang].dir;
  const mark = lang === "ar" ? LETTERS_AR : LETTERS;
  const face = (id) => <ItemFace domain={domain} id={id} lang={lang} size={46} />;

  return (
    <>
      <div className="topbar noprint">
        <Link className="back" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🖨️ {t("worksheets")}</strong>
        <span />
      </div>

      <div className="card noprint">
        <p className="muted">{t("worksheetsNote")}</p>
        <label htmlFor="ws-topic">{t("wsTopic")}</label>
        <select id="ws-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {content.domains.map((d) => <option key={d.id} value={d.id}>{resolveText(d.title, lang)}</option>)}
          <option value="vocab">{t("wsVocab")}</option>
        </select>
        <label>{t("wsActivity")}</label>
        <div className="chips">
          {acts.map((a) => (
            <button key={a} className={`chip ${a === act ? "on" : ""}`} aria-pressed={a === act} onClick={() => setActivity(a)}>{t(ACT_KEY[a])}</button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} /> {t("wsKey")}</label>
        <div className="actions">
          <button className="btn secondary small" onClick={() => setSeed((s) => s + 1)}>🔀 {t("wsNew")}</button>
          <button className="btn small" onClick={() => window.print()}>🖨️ {t("wsPrint")}</button>
        </div>
      </div>

      <article className="sheet" dir={strings[lang].dir} data-testid="sheet">
        <header>
          <h2>🌼 MindBloom — {t(ACT_KEY[act])}</h2>
          <div className="sheetlines">
            <span>{t("wsNameLine")}: <i>{state.child?.name ?? ""}</i></span>
            <span>{t("wsDateLine")}: <i /></span>
          </div>
          <p className="muted">{t(HOW_KEY[act])}</p>
        </header>

        {act === "trace" && sheet.rows.map((r) => (
          <div className="wsrow trace" key={r.id} dir={dir}>
            <span className="solid">{face(r.id)}</span>
            {Array.from({ length: 5 }, (_, i) => <span key={i} className="ghost">{face(r.id)}</span>)}
          </div>
        ))}

        {act === "circle" && sheet.rows.map((r) => (
          <div className="wsrow circle" key={r.target} dir={dir}>
            <span className="solid boxed">{face(r.target)}</span>
            <span className="sep">→</span>
            {r.options.map((o, i) => <span key={i} className={`opt ${key && o === r.target ? "ans" : ""}`}>{face(o)}</span>)}
          </div>
        ))}

        {act === "count" && sheet.rows.map((r) => (
          <div className="wsrow count" key={r.id}>
            <span className="objs">{Array(r.n).fill(r.emoji).join(" ")}</span>
            <span className={`writebox ${key ? "ans" : ""}`}>{key ? itemLabel(domain, r.id, lang) : ""}</span>
          </div>
        ))}

        {act === "match" && (
          <div className="wsmatch" dir={strings[lang].dir}>
            <div className="col">
              {sheet.pairs.map((p, i) => (
                <div className="mrow" key={i}>
                  <b>{i + 1}</b>
                  <span className="mcell">
                    {p.left.shape ? <ShapeSvg id={p.left.shape} color={domain.items.find((x) => x.id === p.left.shape)?.color} size={56} />
                      : p.left.emoji ? <span className="big">{p.left.emoji}</span>
                      : <span className="big">{itemLabel(domain, p.left.id, lang)}</span>}
                  </span>
                  <span className="dot" />
                </div>
              ))}
            </div>
            <div className="col">
              {sheet.order.map((pi, i) => {
                const p = sheet.pairs[pi];
                return (
                  <div className="mrow" key={pi}>
                    <span className="dot" />
                    <span className="mcell">
                      {p.right.emoji && <span className="big">{p.right.emoji}</span>}
                      {p.right.text && <span className="word">{p.right.text}</span>}
                    </span>
                    <b>{mark[i]}</b>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {act === "match" && key && (
          <p className="keyline">{t("wsKeyLabel")}: {sheet.pairs.map((p, i) => `${i + 1}-${mark[sheet.order.indexOf(p.key)]}`).join("   ")}</p>
        )}
      </article>
    </>
  );
}
