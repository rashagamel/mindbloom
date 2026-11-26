// MindBloom service worker: precache every page + its JS/CSS once, then work offline.
const CACHE = "mindbloom-v1";
const ASSET_RE = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\\\s)<>]+/g;

async function precache() {
  const cache = await caches.open(CACHE);
  const manifest = await (await fetch("/routes.json", { cache: "no-store" })).json();
  const assets = new Set();
  for (const route of manifest.routes) {
    try {
      const res = await fetch(route, { cache: "no-store" });
      if (!res.ok) continue;
      await cache.put(route, res.clone());
      const html = await res.text();
      for (const m of html.matchAll(ASSET_RE)) {
        const u = m[0].startsWith("/_next/") ? m[0] : "/_next/" + m[0];
        assets.add(u);
      }
    } catch {}
  }
  for (const f of manifest.files) assets.add(f);
  await Promise.all(
    [...assets].map(async (u) => {
      try {
        if (!(await cache.match(u))) await cache.add(u);
      } catch {}
    })
  );
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(precache());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube etc. go straight to the network
  if (url.pathname === "/sw.js") return;

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Pages, RSC payloads and everything else: network first, cached copy when offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true }));
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("/")) || Response.error();
        return Response.error();
      })
  );
});
