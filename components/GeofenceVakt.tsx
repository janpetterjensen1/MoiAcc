"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { MapPin, CheckCircle2, X, Loader2, Navigation, Clock } from "lucide-react";
import { hentDagensGeoSesjoner, autoKvitterAction } from "@/app/actions/geofence";
import { format } from "date-fns";

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

/** Haversine-formel: avstand i meter */
function avstandMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Beregn tidspunkt for geo-sjekk: 10 minutter etter sesjonstart.
 * Returnerer null hvis allerede passert eller starttid mangler.
 */
function beregnSjekktidMs(sesjon: GeoSesjon): number | null {
  if (!sesjon.planned_start_time) return null;

  const [h, m] = sesjon.planned_start_time.split(":").map(Number);
  const iDag = new Date();
  const start = new Date(iDag);
  start.setHours(h, m, 0, 0);

  const sjekktidMs = start.getTime() + 30 * 1000; // TEST: 30 sek
  const naa = Date.now();

  // Allerede passert?
  if (sjekktidMs <= naa) return null;

  return sjekktidMs - naa;
}

/** Formater starttid og sjekktidspunkt */
function formatKl(sesjon: GeoSesjon): string {
  if (!sesjon.planned_start_time) return "";
  const [h, m] = sesjon.planned_start_time.split(":").map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  const slutt = new Date(start.getTime() + sesjon.planned_duration_h * 3600 * 1000);
  const sjekk = new Date(start.getTime() + 10 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(start.getHours())}:${pad(start.getMinutes())}–${pad(slutt.getHours())}:${pad(slutt.getMinutes())} · sjekk kl. ${pad(sjekk.getHours())}:${pad(sjekk.getMinutes())}`;
}

export function GeofenceVakt() {
  const [aktivert, setAktivert] = useState(false);
  const [sesjoner, setSesjoner] = useState<GeoSesjon[]>([]);
  const [funnet, setFunnet] = useState<GeoSesjon | null>(null);
  const [avvist, setAvvist] = useState<Set<string>>(new Set());
  const [kvittert, setKvittert] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [suksess, setSuksess] = useState<string | null>(null);
  const [swRegistrert, setSwRegistrert] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sesjonerRef = useRef<GeoSesjon[]>([]);

  // Les geo-innstilling fra localStorage
  useEffect(() => {
    const lagret = localStorage.getItem("geoSjekk");
    setAktivert(lagret === null ? true : lagret === "true"); // default: på
  }, []);

  // ── Registrer Service Worker ──────────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwRegistrert(true);
          // Lyt på meldinger fra SW (notifikasjonsklikk → sjekk nå)
          navigator.serviceWorker.addEventListener("message", (e) => {
            if (e.data?.type === "GEOFENCE_CHECK_NOW") {
              const sesjon = sesjonerRef.current.find((s) => s.id === e.data.sesjonId);
              if (sesjon) utforGeoSjekk(sesjon);
            }
          });
        })
        .catch(() => {}); // Ikke kritisk
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Last dagens sesjoner (bare om aktivert) ───────────────────────────────
  useEffect(() => {
    if (!aktivert) return;
    hentDagensGeoSesjoner().then((data) => {
      setSesjoner(data);
      sesjonerRef.current = data;
    });
  }, [aktivert]);

  // ── Be om notifikasjonstillatelse ─────────────────────────────────────────
  useEffect(() => {
    if (sesjoner.length === 0) return;
    const harStarttid = sesjoner.some((s) => s.planned_start_time);
    if (!harStarttid) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [sesjoner]);

  // ── GPS-sjekk for én sesjon ───────────────────────────────────────────────
  const utforGeoSjekk = useCallback((sesjon: GeoSesjon) => {
    if (avvist.has(sesjon.id) || kvittert.has(sesjon.id)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = avstandMeter(
          pos.coords.latitude,
          pos.coords.longitude,
          sesjon.lat,
          sesjon.lng
        );
        if (dist <= sesjon.geofence_radius_m) {
          // Innenfor radius → vis dialog
          setFunnet(sesjon);
        }
        // Utenfor radius → stille, ingen dialog
      },
      () => {
        // GPS-feil → stille
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avvist, kvittert]);

  // ── Sett opp timere (10 min etter start) ─────────────────────────────────
  useEffect(() => {
    // Rydd gamle timere
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();

    for (const sesjon of sesjoner) {
      if (avvist.has(sesjon.id) || kvittert.has(sesjon.id)) continue;

      const msIgjen = beregnSjekktidMs(sesjon);

      if (msIgjen === null) {
        // Ingen starttid satt: fall tilbake til kontinuerlig watchPosition
        continue;
      }

      const timer = setTimeout(() => {
        // Midtpunktet nådd
        if (avvist.has(sesjon.id) || kvittert.has(sesjon.id)) return;

        // Prøv GPS-sjekk
        if (navigator.geolocation) {
          utforGeoSjekk(sesjon);
        }

        // Vis lokal notifikasjon (fungerer selv om app er minimert)
        if (
          swRegistrert &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(`MoiAcc — ${sesjon.short_name}`, {
              body: `10 min inne i ${sesjon.planned_duration_h}t oppdrag. Er du der? Trykk for å kvittere.`,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              requireInteraction: true,
              data: { sesjonId: sesjon.id },
            });
          });
        }
      }, msIgjen);

      timersRef.current.set(sesjon.id, timer);
    }

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesjoner, avvist, kvittert, swRegistrert]);

  // ── Fallback: watchPosition for sesjoner uten starttid ───────────────────
  useEffect(() => {
    const utenTid = sesjoner.filter((s) => !s.planned_start_time);
    if (!navigator.geolocation || utenTid.length === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const naa = new Date().getHours();
        if (naa < 10) return;
        for (const sesjon of utenTid) {
          if (avvist.has(sesjon.id) || kvittert.has(sesjon.id)) continue;
          const dist = avstandMeter(
            pos.coords.latitude,
            pos.coords.longitude,
            sesjon.lat,
            sesjon.lng
          );
          if (dist <= sesjon.geofence_radius_m) {
            setFunnet(sesjon);
            return;
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesjoner, avvist, kvittert]);

  // ── Handlinger ────────────────────────────────────────────────────────────
  function avvis() {
    if (!funnet) return;
    setAvvist((prev) => new Set(prev).add(funnet.id));
    setFunnet(null);
  }

  function bekreft() {
    if (!funnet) return;
    const dagStr = format(new Date(), "yyyy-MM-dd");
    const sesjonSnapshot = funnet;
    startTransition(async () => {
      const res = await autoKvitterAction(
        sesjonSnapshot.id,
        sesjonSnapshot.customer_id,
        dagStr,
        sesjonSnapshot.planned_duration_h
      );
      if (res.ok) {
        setKvittert((prev) => new Set(prev).add(sesjonSnapshot.id));
        setSuksess(sesjonSnapshot.short_name);
        setFunnet(null);
        setSesjoner((prev) => prev.filter((s) => s.id !== sesjonSnapshot.id));
        sesjonerRef.current = sesjonerRef.current.filter((s) => s.id !== sesjonSnapshot.id);
        setTimeout(() => setSuksess(null), 5000);
      }
    });
  }

  if (!funnet && !suksess) return null;

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

      {/* Geofence-dialog */}
      {funnet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={avvis}
          />
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            style={{
              background: "rgba(4,10,4,0.97)",
              border: "1px solid rgba(201,168,76,0.28)",
              backdropFilter: "blur(24px)",
            }}
          >
            <button
              onClick={avvis}
              className="absolute top-4 right-4 opacity-40 hover:opacity-80 transition-opacity"
              style={{ color: "rgba(168,216,168,0.8)" }}
            >
              <X size={18} />
            </button>

            {/* Ikon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}
            >
              <Navigation size={22} style={{ color: "#c9a84c" }} />
            </div>

            {/* Tekst */}
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(201,168,76,0.6)" }}>
              Midtpunkt nådd · Geofence ✓
            </p>
            <h2 className="text-lg font-bold mb-1" style={{ color: "rgba(232,213,160,0.95)" }}>
              Du er ved {funnet.short_name}
            </h2>
            <p className="text-sm mb-2" style={{ color: "rgba(168,216,168,0.55)" }}>
              Vil du kvittere for{" "}
              <span style={{ color: "rgba(232,213,160,0.85)" }}>
                {funnet.planned_duration_h} timer
              </span>{" "}
              som utført?
            </p>

            {/* Tidsinfo */}
            {funnet.planned_start_time && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2 text-xs"
                style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.12)" }}
              >
                <Clock size={11} style={{ color: "#c9a84c" }} />
                <span style={{ color: "rgba(168,216,168,0.5)" }}>{formatKl(funnet)}</span>
              </div>
            )}

            {/* GPS-info */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5 text-xs"
              style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.12)" }}
            >
              <MapPin size={11} style={{ color: "#c9a84c" }} />
              <span style={{ color: "rgba(168,216,168,0.5)" }}>
                Innenfor {funnet.geofence_radius_m} m fra kundens adresse
              </span>
            </div>

            {/* Knapper */}
            <div className="flex gap-3">
              <button
                onClick={avvis}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(168,216,168,0.5)",
                }}
              >
                Ikke nå
              </button>
              <button
                onClick={bekreft}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isPending ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.15)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  color: "#c9a84c",
                }}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Kvittér
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
