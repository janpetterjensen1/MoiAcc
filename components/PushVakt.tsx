"use client";

import { useEffect } from "react";
import { lagrePushSubscriptionAction } from "@/app/actions/geofence";

// Offentlig VAPID-nøkkel — trygt å eksponere i klientkode
const VAPID_PUBLIC_KEY =
  "BN_vGnkmLqiUA2bE5yjgToW5kINHNZQdASv5TrFy2nGE1GUXwoMhtUTOCwCCy2FLgw5RIVTbIy3ViHgNSCvSTJk";

function base64UrlToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Registrerer service worker og vedlikeholder push-abonnement.
 * Kjøres stille i bakgrunnen på alle dashbord-sider.
 * Auto-kvittering skjer via Edge Function + VAPID push, ikke klient-timere.
 */
export function PushVakt() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (localStorage.getItem("geoSjekk") !== "true") return;

    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const eksisterende = await reg.pushManager.getSubscription();
      if (eksisterende) return; // Allerede abonnert

      // Abonnementet har falt bort — re-abonner automatisk
      if (Notification.permission !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
      });

      const p256dh = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      if (!p256dh || !auth) return;

      await lagrePushSubscriptionAction({
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64Url(p256dh),
        auth: arrayBufferToBase64Url(auth),
      });
    }).catch(() => {});
  }, []);

  return null;
}
