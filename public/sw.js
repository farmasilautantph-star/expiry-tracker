const CACHE = "expiry-v2";
const PRECACHE = ["/", "/login"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only handle GET, skip API routes and cross-origin
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful navigation responses
        if (res.ok && e.request.mode === "navigate") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(
          (cached) =>
            cached ||
            new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Expiry Tracker</title>
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
              <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}
              .box{text-align:center;padding:2rem;max-width:320px}h1{color:#1e3a5f;font-size:1.5rem;margin-bottom:.5rem}p{color:#64748b}</style></head>
              <body><div class="box"><h1>You're Offline</h1><p>Please check your connection and try again.</p></div></body></html>`,
              { headers: { "Content-Type": "text/html" } }
            )
        )
      )
  );
});
