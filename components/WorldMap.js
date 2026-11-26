"use client";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { config, findDomain, worldOf, itemLabel, domainLang } from "@/lib/content";
import { isLevelUnlocked, levelProgress, resolveText } from "@/lib/engine";
import { Mascot } from "./Visuals";
import WorldArt from "./WorldArt";
import ItemFace from "./ItemFace";

export default function WorldMap({ domainId }) {
  const { state, ready, lang, t } = useApp();
  const domain = findDomain(domainId);
  const world = worldOf(domainId);
  if (!ready) return null;
  if (!domain || !world) return <p>Not found. <Link href="/">{t("home")}</Link></p>;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const cl = domainLang(domain, lang);
  const cleared = world.levels.filter((l) => levelProgress(state, domainId, l.id).stars >= 1).length;

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>{world.icon} {resolveText(domain.title, lang)}</strong>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <div className="mapbanner"><WorldArt art={world.art} height={90} /></div>
      <p className="muted center">{t("levelsDone", { n: cleared, m: world.levels.length })}</p>
      <div className="map" style={{ background: `linear-gradient(${world.from}, ${world.to})` }}>
        {world.levels.map((l, i) => {
          const open = isLevelUnlocked(world, i, state, config);
          const p = levelProgress(state, domainId, l.id);
          const side = i % 2 === 0 ? "left" : "right";
          const node = (
            <div className={`node ${side} ${open ? "open" : "locked"} ${p.stars ? "won" : ""}`} style={{ "--c": l.color }}>
              <div className="nodecircle">{open ? l.icon : "🔒"}</div>
              <div className="nodeinfo">
                <b>{t("level", { n: i + 1 })}</b>
                <span>{resolveText(l.title, lang)}</span>
                <span className="nodeitems" lang={cl}>{l.items.map((id) => <span key={id}><ItemFace domain={domain} id={id} lang={cl} size={26} />{" "}</span>)}</span>
                <span className="nodestars">{[1, 2, 3].map((n) => <i key={n} className={n <= p.stars ? "on" : ""}>★</i>)}</span>
              </div>
            </div>
          );
          return open ? <Link key={l.id} href={`/level/${domainId}/${l.id}`} className="nodelink">{node}</Link> : <div key={l.id} className="nodelink">{node}</div>;
        })}
        <div className="mapmascot"><Mascot mood="happy" size={70} /></div>
      </div>
    </>
  );
}
