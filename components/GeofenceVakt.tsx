"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { CheckCircle2, Bell, BellOff } from "lucide-react";
import { hentDagensGeoSesjoner, autoKvitterAction } from "@/app/actions/geofence";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";

// VAPID public key — samme som i edge function
const VAPID_KEY = "BDq7UbRah_Ik92NdhowON-_Ct9RXrDTcN-41JvA-xQ9mRrXhtuBuBwUoRbvY9cjvQCwPATK3WXf545J6xAhQv_s";

interface GeoSesjon {
  id: string;
  customer_id: string;
  short_name: string;
  planned_duration_h: number;
  planned_start_time: string | null;
  lat: number;
  lng: number;
  geofence_radius_m: number;
}

function avstandMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function beregnSjekktidMs(sesjon: GeoSesjon): number | null {
  if (!sesjon.planned_start_time) return null;
  const [h, m] = sesjon.planned_start_time.split(":").map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  const sjekkTid = start.getTime() + 10 * 60 * 1000;
  if (sjekkTid <= Date.now()) return null;
  return sjekkTid - Date.now();
}

async function registrerPushSubscription(reg: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const pad = VAPID_KEY.length % 4;
    const padded = pad ? VAPID_KEY + "=".repeat(4 - pad) : VAPID_KEY;
    const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const applicationServerKey = new Uint8Array(raw.split("").map((c) => c.charCodeAt(0)));

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }

    const json = sub.toJSON();
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return res.ok;
  } catch (e) {
    console.error("Push-registrering feilet:", e);
    return false;
  }
}

function GeofenceVaktInner() {
  const [aktivert, setAktivert] = useState(true);
  const [sesjoner, setSesjoner] = useState<GeoSesjon[]>([]);
  const [suksess, setSuksess] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"ukjent" | "registrert" | "feil" | "avvist" | "ikke-støttet">("ukjent");
  const [aktivererPush, setAktivererPush] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sesjonerRef = useRef<GeoSesjon[]>([]);
  const kvittertRef = useRef<Set<string>>(new Set());
  const searchParams = useSearchParams();

  // Les geo-innstilling
  useEffect(() => {
    const lagret = localStorage.getItem("geoSjekk");
    setAktivert(lagret === null ? true : lagret === "true");
  }, []);

  // Registrer Service Worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      swRef.current = reg;

      // Lyt på GEOFENCE_CHECK_NOW fra SW
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "GEOFENCE_CHECK_NOW") {
          const sesjon = sesjonerRef.current.find((s) => s.id === e.data.sesjonId);
          if (sesjon) utforGeoSjekkOgKvitter(sesjon);
        }
      });

      // Sjekk eksisterende push-status stille (ikke be om tillatelse automatisk)
      if (!("PushManager" in window)) {
        setPushStatus("ikke-støttet");
        return;
      }
      if (Notification.permission === "denied") {
        setPushStatus("avvist");
        return;
      }
      // Sjekk om subscription allerede finnes
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          // Subscription finnes — synkroniser med serveren stille
          const json = sub.toJSON();
          fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
          }).then((r) => setPushStatus(r.ok ? "registrert" : "ukjent"));
        }
        // Ingen subscription ennå — vis "Aktiver"-knapp
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Last dagens sesjoner
  useEffect(() => {
    if (!aktivert) return;
    hentDagensGeoSesjoner().then((data) => {
      setSesjoner(data);
      sesjonerRef.current = data;
    });
  }, [aktivert]);

  // Aktiver push manuelt (bruker-handling → iOS godtar dette)
  async function aktiverPush() {
    if (!swRef.current) return;
    setAktivererPush(true);
    try {
      const tillatelse = await Notification.requestPermission();
      if (tillatelse === "denied") { setPushStatus("avvist"); return; }
      if (tillatelse !== "granted") return;
      const ok = await registrerPushSubscription(swRef.current);
      setPushStatus(ok ? "registrert" : "feil");
    } finally {
      setAktivererPush(false);
    }
  }

  // Auto-kvitter
  const kvitter = useCallback(async (sesjon: GeoSesjon) => {
    if (kvittertRef.current.has(sesjon.id)) return;
    kvittertRef.current.add(sesjon.id);
    const dagStr = format(new Date(), "yyyy-MM-dd");
    const res = await autoKvitterAction(sesjon.id, sesjon.customer_id, dagStr, sesjon.planned_duration_h);
    if (res.ok) {
      setSuksess(sesjon.short_name);
      setSesjoner((prev) => prev.filter((s) => s.id !== sesjon.id));
      sesjonerRef.current = sesjonerRef.current.filter((s) => s.id !== sesjon.id);
      setTimeout(() => setSuksess(null), 6000);
    } else {
      kvittertRef.current.delete(sesjon.id);
    }
  }, []);

  // GPS-sjekk → auto-kvitter
  const utforGeoSjekkOgKvitter = useCallback((sesjon: GeoSesjon) => {
    if (kvittertRef.current.has(sesjon.id) || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = avstandMeter(pos.coords.latitude, pos.coords.longitude, sesjon.lat, sesjon.lng);
        if (dist <= sesjon.geofence_radius_m) kvitter(sesjon);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [kvitter]);

  // Timere (10 min etter sesjonstart)
  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    for (const sesjon of sesjoner) {
      if (kvittertRef.current.has(sesjon.id)) continue;
      const msIgjen = beregnSjekktidMs(sesjon);
      if (msIgjen === null) continue;
      const timer = setTimeout(() => {
        if (kvittertRef.current.has(sesjon.id)) return;
        utforGeoSjekkOgKvitter(sesjon);
      }, msIgjen);
      timersRef.current.set(sesjon.id, timer);
    }
    return () => { timersRef.current.forEach((t) => clearTimeout(t)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesjoner]);

  // Fallback watchPosition for sesjoner uten starttid
  useEffect(() => {
    const utenTid = sesjoner.filter((s) => !s.planned_start_time);
    if (!navigator.geolocation || utenTid.length === 0) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (new Date().getHours() < 10) return;
        for (const sesjon of utenTid) {
          if (kvittertRef.current.has(sesjon.id)) continue;
          const dist = avstandMeter(pos.coords.latitude, pos.coords.longitude, sesjon.lat, sesjon.lng);
          if (dist <= sesjon.geofence_radius_m) { utforGeoSjekkOgKvitter(sesjon); return; }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesjoner]);

  // Håndter ?geofence=sesjonId fra notifikasjonsklikk
  useEffect(() => {
    const sesjonId = searchParams.get("geofence");
    if (!sesjonId || sesjonerRef.current.length === 0) return;
    const sesjon = sesjonerRef.current.find((s) => s.id === sesjonId);
    if (sesjon) utforGeoSjekkOgKvitter(sesjon);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sesjoner]);

  return (
    <>
      {/* Suksess-toast */}
      {suksess && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium whitespace-nowrap"
          style={{ background: "rgba(13,61,53,0.97)", color: "#7de8d0", border: "1px solid rgba(125,232,208,0.3)" }}
        >
          <CheckCircle2 size={16} />
          {suksess} — auto-kvittert ✓
        </div>
      )}

      {/* Push-aktiverings-knapp — vises øverst til høyre når push ikke er satt opp */}
      {aktivert && pushStatus !== "registrert" && pushStatus !== "ikke-støttet" && (
        <div className="fixed top-[54px] right-3 z-40">
          {pushStatus === "avvist" ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: "rgba(120,30,20,0.88)", color: "#ffb0a0", border: "1px solid rgba(255,80,60,0.3)" }}
            >
              <BellOff size={12} />
              Varsler blokkert
            </div>
          ) : (
            <button
              onClick={aktiverPush}
              disabled={aktivererPush}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{
                background: "rgba(201,168,76,0.13)",
                color: "#c9a84c",
                border: "1px solid rgba(201,168,76,0.35)",
              }}
            >
              <Bell size={12} />
              {aktivererPush ? "Aktiverer…" : "Aktiver geo-varsler"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function GeofenceVakt() {
  return (
    <Suspense>
      <GeofenceVaktInner />
    </Suspense>
  );
}
