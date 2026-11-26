"use client";
import { useEffect } from "react";

// Registers the offline service worker (production only) and keeps the install prompt
// so the parent page / home chip can show an Install button.
export default function PwaBoot() {
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      window.__mbInstall = e;
      window.dispatchEvent(new Event("mb-install"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => {
      window.__mbInstall = null;
      window.dispatchEvent(new Event("mb-install"));
    });
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
