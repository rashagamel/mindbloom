"use client";
import { useApp } from "./AppProvider";
import { strings } from "@/lib/content";

// One tap switches the whole app between Arabic and English (text, direction, voice).
export default function LangSwitch() {
  const { lang, setLang, ready } = useApp();
  if (!ready) return null;
  const other = Object.keys(strings).find((l) => l !== lang);
  return (
    <div className="langbar">
      <button className="langpill" onClick={() => setLang(other)} lang={other} aria-label={strings[other].languageName}>
        🌐 {strings[other].languageName}
      </button>
    </div>
  );
}
