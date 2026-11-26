"use client";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { probeVoices, speak } from "@/lib/speech";

const ROWS = [["ar", "ar-SA", "voiceArabic", "أَلِف، بَاء، تَاء"], ["en", "en-US", "voiceEnglish", "A, B, C"]];

// For grown-ups: can the app read each language aloud? Shows the online voice (works on every phone
// with internet) and the phone's own voice (offline backup), each with a test button.
export default function SoundCheck() {
  const { t } = useApp();
  const [res, setRes] = useState({});
  useEffect(() => {
    ROWS.forEach(([id, code]) => probeVoices(code).then((r) => setRes((x) => ({ ...x, [id]: r }))));
  }, []);
  return (
    <div className="card" data-testid="sound-check">
      <h2 style={{ marginTop: 0 }}>🔊 {t("soundCheck")}</h2>
      {ROWS.map(([id, code, label, sample]) => {
        const r = res[id];
        return (
          <div key={id} className="voicerow">
            <span>
              {r == null ? "…" : r.cloud || r.device ? "✅" : "⚠️"} <b>{t(label)}</b>{" "}
              <span className="muted small">
                {r == null ? "" : `${t("voiceCloud")}: ${r.cloud ? t("voiceCloudOk") : t("voiceCloudBad")} · ${t("voiceDevice")}: ${r.device ?? t("voiceMissing")}`}
              </span>
            </span>
            <button className="btn secondary small" onClick={() => speak(sample, code)}>▶ {t("voiceTest")}</button>
          </div>
        );
      })}
      <p className="muted small">{t("soundCheckNote")}</p>
    </div>
  );
}
