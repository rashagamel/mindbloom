"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { about } from "@/lib/content";
import { resolveText } from "@/lib/engine";

export default function About() {
  const { ready, lang, t } = useApp();
  if (!ready) return null;
  const r = (v) => resolveText(v, lang);
  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <strong>💡 {t("problemSolution")}</strong>
        <span />
      </div>
      <div className="card">
        <h2>{r(about.problem.title)}</h2>
        {about.problem.points.map((p, i) => <p key={i} className="point"><span>{p.icon}</span> {r(p.text)}</p>)}
      </div>
      <div className="card solution">
        <h2>{r(about.solution.title)}</h2>
        <p>{r(about.solution.text)}</p>
      </div>
      <div className="card">
        <h2>{r(about.loop.title)}</h2>
        <div className="loop">
          {about.loop.steps.map((s, i) => (
            <div key={i} className="step"><div className="stepicon">{s.icon}</div><b>{r(s.title)}</b><span>{r(s.text)}</span></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>{r(about.limits.title)}</h2>
        <p>{r(about.limits.text)}</p>
      </div>
    </>
  );
}
