"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { lagrePushSubscriptionAction, slettPushSubscriptionAction } from "@/app/actions/geofence";

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

export function GeoSjekkToggle() {
  const [aktivert, setAktivert] = useState(false);
  const [lastet, setLastet] = useState(false);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [stottes, setStottes] = useState(true);

  useEffect(() => {
    const harStoette =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setStottes(harStoette);

    const lagret = localStorage.getItem("geoSjekk");
    setAktivert(lagret === "true");
    setLastet(true);
  }, []);

  async function toggle() {
    if (!stottes) return;
    setFeil(null);
    setLaster(true);

    if (!aktivert) {
      // Slå PÅ — be om tillatelse og abonner
      try {
        const tillatelse = await Notification.requestPermission();
        if (tillatelse !== "granted") {
          setFeil("Varsler er blokkert i nettleseren.");
          setLaster(false);
          return;
        }

        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Avslutt gammelt abonnement om det finnes
        const gammelt = await reg.pushManager.getSubscription();
        if (gammelt) await gammelt.unsubscribe();

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });

        const p256dh = sub.getKey("p256dh");
        const auth = sub.getKey("auth");
        if (!p256dh || !auth) throw new Error("Nøkler mangler i push-abonnement");

        const res = await lagrePushSubscriptionAction({
          endpoint: sub.endpoint,
          p256dh: arrayBufferToBase64Url(p256dh),
          auth: arrayBufferToBase64Url(auth),
        });

        if (!res.ok) throw new Error(res.feil);

        localStorage.setItem("geoSjekk", "true");
        setAktivert(true);
      } catch (e) {
        setFeil(e instanceof Error ? e.message : "Noe gikk galt.");
      }
    } else {
      // Slå AV — avslutt abonnement
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await slettPushSubscriptionAction(sub.endpoint);
            await sub.unsubscribe();
          }
        }
        localStorage.setItem("geoSjekk", "false");
        setAktivert(false);
      } catch (e) {
        setFeil(e instanceof Error ? e.message : "Noe gikk galt.");
      }
    }

    setLaster(false);
  }

  if (!lastet) return null;

  return (
    <div className="py-3 border-t border-slate-100 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700">Auto-kvittering</p>
            <p className="text-xs text-slate-400">
              {stottes
                ? "Server kvitterer 10 min etter sesjonstart"
                : "Ikke støttet i denne nettleseren"}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={laster || !stottes}
          role="switch"
          aria-checked={aktivert}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            aktivert ? "bg-green-500" : "bg-slate-200"
          }`}
        >
          {laster ? (
            <Loader2 size={14} className="absolute inset-0 m-auto animate-spin text-white" />
          ) : (
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                aktivert ? "translate-x-5" : "translate-x-0"
              }`}
            />
          )}
        </button>
      </div>
      {feil && <p className="text-xs text-red-500 mt-1.5">{feil}</p>}
    </div>
  );
}
