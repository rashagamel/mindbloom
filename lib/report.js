// Class report: turns every child's saved progress into tables you can open in Excel.
import { summarize } from "./engine.js";

// First and latest check-up for one area, so before/after is one line.
export function prePost(assessments, domainId) {
  const list = (assessments ?? []).filter((a) => a.domainId === domainId).sort((a, b) => a.at - b.at);
  if (!list.length) return null;
  const f = list[0], l = list[list.length - 1];
  const pct = (a) => (a.total ? a.correct / a.total : 0);
  return { n: list.length, first: pct(f), latest: pct(l), change: list.length > 1 ? pct(l) - pct(f) : null };
}

const round = (x, d = 1) => (x == null ? "" : Math.round(x * 10 ** d) / 10 ** d);

// One row per child per area.
export function summaryRows(profiles, { content, config, levels, labelOf }) {
  const rows = [];
  for (const { id, state } of profiles) {
    const name = state.child?.name ?? "";
    for (const r of summarize(state, content, config, levels)) {
      const pp = prePost(state.assessments, r.domain.id);
      const top = r.confusions[0];
      rows.push({
        child_id: id,
        child: name,
        language: state.child?.lang ?? "",
        area: r.domain.id,
        games_played: state.sessions,
        stars_total: state.stars,
        levels_cleared: r.levelsTotal ? r.levelsCleared : "",
        levels_total: r.levelsTotal || "",
        mastery_pct: r.attempts ? round(r.mean * 100) : "",
        answers: r.attempts,
        accuracy_pct: r.attempts ? round((r.correct / r.attempts) * 100) : "",
        needs_practice: r.needs.map((n) => labelOf(r.domain, n.id)).join(" "),
        top_mixup: top ? `${labelOf(r.domain, top.target)}/${labelOf(r.domain, top.chosen)}` : "",
        checkups: pp?.n ?? 0,
        checkup_first_pct: pp ? round(pp.first * 100) : "",
        checkup_latest_pct: pp ? round(pp.latest * 100) : "",
        checkup_change_pts: pp?.change == null ? "" : round(pp.change * 100),
      });
    }
  }
  return rows;
}

// One row per finished check-up (long format: ready for a before/after analysis).
export function checkupRows(profiles) {
  const rows = [];
  for (const { id, state } of profiles) {
    const seen = {};
    [...(state.assessments ?? [])].sort((a, b) => a.at - b.at).forEach((a) => {
      seen[a.domainId] = (seen[a.domainId] ?? 0) + 1;
      rows.push({
        child_id: id,
        child: state.child?.name ?? "",
        area: a.domainId,
        attempt_no: seen[a.domainId],
        date: new Date(a.at).toISOString().slice(0, 10),
        correct: a.correct,
        total: a.total,
        pct: a.total ? round((a.correct / a.total) * 100) : "",
      });
    });
  }
  return rows;
}

// RFC 4180 quoting. The BOM makes Excel read Arabic names correctly.
export function toCSV(rows, headers = rows[0] ? Object.keys(rows[0]) : []) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return "﻿" + [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}
