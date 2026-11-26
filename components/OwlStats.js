"use client";
import { useApp } from "./AppProvider";
import { owl } from "@/lib/content";
import { numberSummary, numLabel } from "@/lib/quantity";

const NAME = { look: "owlLook", line: "owlLine", more: "owlMore" };

// Parent view of Quick Look Owl: how each game is going and which numbers needed the most help.
export default function OwlStats() {
  const { state, lang, t } = useApp();
  const rows = numberSummary(state, owl.games.map((g) => g.id));
  const any = rows.some((r) => r.total > 0);
  // keys look like "7" (look) or "3/10" (line); the comparison game has no single number to show
  const words = (r) => (r.id === "more" ? [] : r.hard.map((k) => numLabel(k.split("/")[0], lang)));
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>🦉 {t("owlStats")}</h2>
      {!any && <p className="muted">{t("owlStatsEmpty")}</p>}
      {rows.filter((r) => r.total > 0).map((r) => (
        <div key={r.id} style={{ marginBottom: 10 }}>
          <b>{owl.games.find((g) => g.id === r.id).icon} {t(NAME[r.id])}</b>
          <div className="bar"><span style={{ width: `${(r.right / r.total) * 100}%` }} /></div>
          <span className="muted">{t("safariStatsRow", { right: r.right, wrong: r.wrong })}</span>
          {words(r).length > 0 && <div className="muted">{t("owlStatsHard", { words: words(r).join(", ") })}</div>}
        </div>
      ))}
      <p className="muted">{t("owlStatsWhy")}</p>
    </div>
  );
}
