"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { library, strings } from "@/lib/content";
import { resolveText } from "@/lib/engine";

export default function Library() {
  const { state, ready, lang, t } = useApp();
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  const types = [...new Set(library.items.map((i) => i.type))];

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <h1>{t("library")}</h1>
      {types.map((type) => (
        <section key={type}>
          <h2>{t(`type_${type}`)}</h2>
          <div className="grid">
            {library.items.filter((i) => i.type === type).map((i) => (
              <Link key={i.id} href={`/library/${i.id}`} className="card domain">
                <span className="icon">{i.icon}</span>
                <span lang={i.lang}>{resolveText(i.title, lang)}</span>
                <span className="muted">{strings[i.lang]?.languageName}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
