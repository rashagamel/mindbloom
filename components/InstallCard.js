"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";

// Shows: offline-ready status, and an Install button (or the iOS hint).
export default function InstallCard() {
  const { t } = useApp();
  const [offline, setOffline] = useState(0); // cached page count
  const [canInstall, setCanInstall] = useState(false);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setCanInstall(!!window.__mbInstall);
      try {
        const keys = await caches.keys();
        let n = 0;
        for (const k of keys) n = Math.max(n, (await (await caches.open(k)).keys()).length);
        setOffline(n);
      } catch {}
    };
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setStandalone(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true);
    refresh();
    const id = setInterval(refresh, 2000);
    window.addEventListener("mb-install", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("mb-install", refresh);
    };
  }, []);

  const install = async () => {
    const e = window.__mbInstall;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    window.__mbInstall = null;
    setCanInstall(false);
  };

  return (
    <section className="card" data-testid="install-card">
      <h3>📲 {t("installTitle")}</h3>
      <p className="muted">{t("installBody")}</p>
      <p>
        {offline > 20 ? "✅ " + t("offlineReady") : "⏳ " + t("offlinePreparing")}
        {offline > 0 && <span className="muted"> ({offline})</span>}
      </p>
      {standalone && <p>✅ {t("installed")}</p>}
      {!standalone && canInstall && <button className="btn" onClick={install}>{t("installBtn")}</button>}
      {!standalone && !canInstall && ios && <p className="muted">{t("installIos")}</p>}
    </section>
  );
}
