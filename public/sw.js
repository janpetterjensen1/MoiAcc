const CACHE_NAME = "moiacc-v2";
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
  if (event.request.url.includes("supabase.co")) return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r ?? new Response("Offline", { status: 503 }))
    )
  );
});

// ── Geofence-notifikasjoner ──────────────────────────────────────────────────

// Notification click: fokuser appen og be den kjøre geofence-sjekk nå
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          // Send melding til GeofenceVakt om å kjøre sjekk med én gang
          client.postMessage({ type: "GEOFENCE_CHECK_NOW", sesjonId: data.sesjonId });
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow("/timer?geofence=" + (data.sesjonId ?? ""));
      })
  );
});

// Push fra server (fremtidig bruk — VAPID)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "MoiAcc", {
      body: payload.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: payload.data ?? {},
      requireInteraction: true,
    })
  );
});
