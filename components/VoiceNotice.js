"use client";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { loadVoices } from "@/lib/speech";

// A small banner when the device cannot speak the language the child is hearing.
export default function VoiceNotice() {
  const { t } = useApp();
  const [lang, setLang] = useState(null);
  useEffect(() => {
    loadVoices();
    const on = (e) => setLang(e.detail.lang);
    window.addEventListener("mb-novoice", on);
    return () => window.removeEventListener("mb-novoice", on);
  }, []);
  if (!lang) return null;
  return (
    <div className="voicenotice" role="status">
      <span>🔇 {t(lang === "ar" ? "noVoiceAr" : "noVoiceEn")}</span>
      <button className="btn small secondary" onClick={() => setLang(null)}>{t("dismiss")}</button>
    </div>
  );
}
