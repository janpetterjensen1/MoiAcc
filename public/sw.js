const CACHE_NAME = "moiacc-v1";
const STATIC_ASSETS = ["/", "/dashbord", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Aldri cache Supabase API-kall
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r ?? new Response("Offline", { status: 503 }))
    )
  );
});
