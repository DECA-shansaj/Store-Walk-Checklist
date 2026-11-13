/**
 * Service Worker – Gulfport Store Walk Checklist v2
 * Caches core assets for offline use after first successful load.
 */
const CACHE_NAME = "gp-storewalk-flat-v1.3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./checklist-data.js",
  "./storage.js",
  "./api.js",
  "./report.js",
  "./ui.js",
  "./app.js",
  "./checklist.json",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Do not cache API calls – always network for /api/*
  const url = new URL(req.url);
  if (url.pathname.indexOf("/api/") !== -1) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ ok: false, offline: true }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("./index.html");
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
