"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { content, config, strings, itemLabel, domainLang, levels } from "@/lib/content";
import { emptyState, resolveText, summarize } from "@/lib/engine";
import Insights from "@/components/Insights";
import SoundCheck from "@/components/SoundCheck";
import SafariStats from "@/components/SafariStats";
import OwlStats from "@/components/OwlStats";
import InstallCard from "@/components/InstallCard";
import { checkupRows, prePost, summaryRows, toCSV } from "@/lib/report";

function Gate({ onPass }) {
  const { t } = useApp();
  const [sum, setSum] = useState(null);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    const max = config.adultGate.maxNumber;
    setSum([2 + Math.floor(Math.random() * (max - 1)), 2 + Math.floor(Math.random() * (max - 1))]);
  }, []);
  if (!sum) return null;

  const submit = (e) => {
    e.preventDefault();
    if (Number(answer) === sum[0] + sum[1]) onPass();
    else { setWrong(true); setAnswer(""); }
  };

  return (
    <form className="card center" onSubmit={submit}>
      <h1>{t("gateTitle")}</h1>
      <p>{t("gateQuestion", { a: sum[0], b: sum[1] })}</p>
      <input type="number" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
      {wrong && <p className="muted">{t("gateWrong")}</p>}
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn" type="submit">{t("gateOpen")}</button>
        <Link className="btn secondary" href="/">{t("home")}</Link>
      </div>
    </form>
  );
}

function Dashboard() {
  const { state, setState, lang, t, roster, activeId, removeProfile } = useApp();
  const rows = summarize(state, content, config, levels);
  const [all, setAll] = useState([]);
  useEffect(() => { setAll(roster().filter((p) => p.state.child)); }, [roster, state]);

  const download = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindbloom-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const reset = () => {
    if (!window.confirm(t("resetConfirm"))) return;
    setState(emptyState());
  };

  const save = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const labelOf = (domain, id) => itemLabel(domain, id, "en");
  const reportCtx = { content, config, levels, labelOf };
  const day = new Date().toISOString().slice(0, 10);
  const downloadSummary = () => save(`mindbloom-summary-${day}.csv`, toCSV(summaryRows(all, reportCtx)), "text/csv;charset=utf-8");
  const downloadCheckups = () => save(`mindbloom-checkups-${day}.csv`, toCSV(checkupRows(all)), "text/csv;charset=utf-8");
  const downloadAll = () => save(`mindbloom-all-children-${day}.json`, JSON.stringify(all.map((p) => ({ id: p.id, ...p.state })), null, 2), "application/json");
  const remove = (p) => { if (window.confirm(t("removeConfirm", { name: p.state.child.name }))) removeProfile(p.id); };

  const suggestions = [];
  for (const r of rows) {
    const cl = domainLang(r.domain, lang);
    for (const c of r.confusions.slice(0, 2))
      suggestions.push(t("suggestPair", { a: itemLabel(r.domain, c.target, cl), b: itemLabel(r.domain, c.chosen, cl) }));
    for (const n of r.needs.slice(0, 1))
      suggestions.push(t("suggestItem", { a: itemLabel(r.domain, n.id, cl) }));
  }
  if (!suggestions.length) suggestions.push(t("suggestKeep"));

  return (
    <>
      <div className="topbar">
        <Link className="link" href="/"><span className="arr">←</span> {t("home")}</Link>
        <span className="stars">⭐ {state.stars}</span>
      </div>
      <h1>{t("dashboardTitle")}</h1>
      <p className="muted">{t("dashboardNote")}</p>

      <label htmlFor="ui-lang">{t("language")}</label>
      <select
        id="ui-lang"
        value={lang}
        onChange={(e) => setState((s) => ({ ...s, child: { ...s.child, lang: e.target.value } }))}
      >
        {Object.keys(strings).map((l) => (
          <option key={l} value={l}>{strings[l].languageName}</option>
        ))}
      </select>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>👨‍👩‍👧 {t("classReport")}</h2>
        <p className="muted">{t("classReportNote")}</p>
        {all.length === 0 ? <p className="muted">{t("noChildren")}</p> : (
          <div className="tablewrap">
            <table className="history">
              <thead>
                <tr><th>{t("child")}</th><th>{t("sessions")}</th><th>⭐</th><th>🗺️</th>
                  {content.domains.map((d) => <th key={d.id} title={d.id}>{d.icon} {t("preShort")}→{t("postShort")}</th>)}<th></th></tr>
              </thead>
              <tbody>
                {all.map((p) => (
                  <tr key={p.id} className={p.id === activeId ? "me" : ""}>
                    <td>{p.state.child.avatar ?? "🙂"} {p.state.child.name}</td>
                    <td>{p.state.sessions}</td>
                    <td>{p.state.stars}</td>
                    <td>{summarize(p.state, content, config, levels).reduce((n, r) => n + r.levelsCleared, 0)}</td>
                    {content.domains.map((d) => {
                      const pp = prePost(p.state.assessments, d.id);
                      return <td key={d.id}>{pp ? `${Math.round(pp.first * 100)}→${Math.round(pp.latest * 100)}%` : "–"}</td>;
                    })}
                    <td><button className="link" onClick={() => remove(p)} aria-label={t("removeChild")}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="actions">
          <button className="btn secondary small" onClick={downloadSummary}>⬇ {t("downloadSummary")}</button>
          <button className="btn secondary small" onClick={downloadCheckups}>⬇ {t("downloadCheckups")}</button>
          <button className="btn secondary small" onClick={downloadAll}>⬇ {t("downloadAllJson")}</button>
        </div>
      </div>

      {rows.map((r) => {
        const cl = domainLang(r.domain, lang);
        const pct = Math.round(r.mean * 100);
        return (
          <div className="card" key={r.domain.id}>
            <div className="row">
              <h2 style={{ margin: 0 }}>{r.domain.icon} {resolveText(r.domain.title, lang)}</h2>
              <span className="muted">{r.unlocked} / {r.domain.items.length}{r.levelsTotal ? ` · ${t("levelsCleared")}: ${r.levelsCleared}/${r.levelsTotal}` : ""}</span>
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>{t("mastery")}: {r.attempts ? `${pct}%` : t("nothingYet")}</p>
            <div className="bar"><span style={{ width: `${r.attempts ? pct : 0}%` }} /></div>
            <p className="muted">
              {t("attempts")}: {r.attempts} · {t("accuracy")}: {r.attempts ? Math.round((r.correct / r.attempts) * 100) : 0}%
              {r.strong > 0 && <> · {t("strong")}: {r.strong}</>}
            </p>

            <h2>{t("confusions")}</h2>
            {r.confusions.length ? (
              <ul className="plain">
                {r.confusions.map((c) => (
                  <li key={`${c.target}>${c.chosen}`}>
                    {t("mixedUp", { a: itemLabel(r.domain, c.chosen, cl), b: itemLabel(r.domain, c.target, cl) })}
                    {" "}<span className="pill">{t("times")} {c.weight.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">{t("noConfusions")}</p>}

            {r.needs.length > 0 && (
              <>
                <h2>{t("needsPractice")}</h2>
                <p>{r.needs.map((n) => <span className="pill" key={n.id} lang={cl}>{itemLabel(r.domain, n.id, cl)}</span>)}</p>
              </>
            )}
          </div>
        );
      })}

      <Insights state={state} />
      <SafariStats />
      <OwlStats />
      <div className="actions"><Link className="btn secondary small" href="/report">📄 {t("reportOpen")}</Link></div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>🩺 {t("checkupHistory")}</h2>
        {state.assessments.length === 0 ? (
          <p className="muted">{t("checkupFirst")}</p>
        ) : (
          <table className="history">
            <thead><tr><th>{t("date")}</th><th></th><th>{t("score")}</th><th>{t("change")}</th></tr></thead>
            <tbody>
              {state.assessments.map((a, i) => {
                const before = state.assessments.slice(0, i).filter((x) => x.domainId === a.domainId).at(-1);
                const d = before ? a.correct - before.correct : null;
                const dom = content.domains.find((x) => x.id === a.domainId);
                return (
                  <tr key={a.at}>
                    <td>{new Date(a.at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</td>
                    <td>{dom?.icon}</td>
                    <td>{a.correct}/{a.total}</td>
                    <td>{d == null ? "–" : d > 0 ? `+${d} ▲` : d < 0 ? `${d} ▼` : "="}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="muted small">{t("checkupNote")}</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("suggestions")}</h2>
        <ul className="plain">{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>

      <SoundCheck />
      <InstallCard />

      <p className="muted">{t("privacy")}</p>
      <div className="actions">
        <button className="btn secondary" onClick={download}>{t("download")}</button>
        <button className="btn danger" onClick={reset}>{t("reset")}</button>
      </div>
    </>
  );
}

export default function ParentPage() {
  const { state, ready, t } = useApp();
  const [open, setOpen] = useState(false);
  if (!ready) return null;
  if (!state.child) return <p>{t("noChild")} <Link href="/">{t("home")}</Link></p>;
  return open ? <Dashboard /> : <Gate onPass={() => setOpen(true)} />;
}
