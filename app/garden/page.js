"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Flower } from "@/components/Visuals";
import { levels, findDomain } from "@/lib/content";
import { levelProgress, resolveText } from "@/lib/engine";

export default function Garden() {
  const { state, ready, lang, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const all = levels.worlds.flatMap((w) => w.levels.map((l) => ({ w, l })));
  const earned = all.filter(({ w, l }) => state.stickers.includes(`${w.domain}:${l.id}`));

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>🌻 {t("garden")}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      {levels.worlds.map((w) => (
        <div key={w.domain} className="card">
          <h2>{w.icon} {resolveText(findDomain(w.domain).title, lang)}</h2>
          <div className="gardenrow">
            {w.levels.map((l) => {
              const s = levelProgress(state, w.domain, l.id).stars;
              return (
                <Link key={l.id} href={`/level/${w.domain}/${l.id}`} className={`plot ${s ? "" : "empty"}`}>
                  <Flower stage={s ? 2 + s : 0} size={78} color={l.color} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="card">
        <h2>🎖️ {t("stickerBook")}</h2>
        {earned.length === 0 && <p className="muted">{t("gardenEmpty")}</p>}
        <div className="stickers">
          {all.map(({ w, l }) => {
            const has = state.stickers.includes(`${w.domain}:${l.id}`);
            return <span key={`${w.domain}:${l.id}`} className={`stk ${has ? "" : "off"}`}>{has ? l.sticker : "❔"}</span>;
          })}
        </div>
      </div>
    </>
  );
}
