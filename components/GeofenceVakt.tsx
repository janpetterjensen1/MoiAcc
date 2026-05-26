"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapPin, CheckCircle2, X, Loader2, Navigation } from "lucide-react";
import { hentDagensGeoSesjoner, autoKvitterAction } from "@/app/actions/geofence";
import { format } from "date-fns";

interface GeoSesjon {
  id: string;
  customer_id: string;
  short_name: string;
  planned_duration_h: number;
  lat: number;
  lng: number;
  geofence_radius_m: number;
}

/** Haversine-formel: avstand i meter mellom to GPS-koordinater */
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

export function GeofenceVakt() {
  const [sesjoner, setSesjoner] = useState<GeoSesjon[]>([]);
  const [funnet, setFunnet] = useState<GeoSesjon | null>(null);
  const [avvist, setAvvist] = useState<Set<string>>(new Set());
  const [kvittert, setKvittert] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "watching" | "denied">("idle");
  const [isPending, startTransition] = useTransition();
  const [suksess, setSuksess] = useState(false);
  const watchRef = useRef<number | null>(null);
  const sesjonerRef = useRef<GeoSesjon[]>([]);

  // Last dagens sesjoner med koordinater
  useEffect(() => {
    hentDagensGeoSesjoner().then((data) => {
      setSesjoner(data);
      sesjonerRef.current = data;
    });
  }, []);

  // Start GPS-overvåking
  useEffect(() => {
    if (!navigator.geolocation || sesjoner.length === 0) return;

    setStatus("watching");

    const sjekkPosisjon = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const dagStr = format(new Date(), "yyyy-MM-dd");

      for (const sesjon of sesjonerRef.current) {
        // Hopp over allerede avviste eller kvitterte
        if (avvist.has(sesjon.id) || kvittert.has(sesjon.id)) continue;

        const dist = avstandMeter(latitude, longitude, sesjon.lat, sesjon.lng);

        if (dist <= sesjon.geofence_radius_m) {
          // Sjekk at det er passert rimelig tid på dagen (kl 10+)
          const time = new Date().getHours();
          if (time >= 10) {
            setFunnet({ ...sesjon });
            return;
          }
        }
      }
    };

    watchRef.current = navigator.geolocation.watchPosition(
      sjekkPosisjon,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesjoner]);

  function avvis() {
    if (!funnet) return;
    setAvvist((prev) => new Set(prev).add(funnet.id));
    setFunnet(null);
  }

  function bekreft() {
    if (!funnet) return;
    const dagStr = format(new Date(), "yyyy-MM-dd");
    startTransition(async () => {
      const res = await autoKvitterAction(
        funnet.id,
        funnet.customer_id,
        dagStr,
        funnet.planned_duration_h
      );
      if (res.ok) {
        setKvittert((prev) => new Set(prev).add(funnet.id));
        setSuksess(true);
        setFunnet(null);
        setTimeout(() => setSuksess(false), 4000);
        // Fjern fra listen
        setSesjoner((prev) => prev.filter((s) => s.id !== funnet.id));
        sesjonerRef.current = sesjonerRef.current.filter((s) => s.id !== funnet.id);
      }
    });
  }

  // Ingenting å vise
  if (!funnet && !suksess) return null;

  return (
    <>
      {/* Suksess-toast */}
      {suksess && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium"
          style={{ background: "#0d3d35", color: "#7de8d0", border: "1px solid rgba(125,232,208,0.3)" }}
        >
          <CheckCircle2 size={16} />
          Sesjon auto-kvittert!
        </div>
      )}

      {/* Geofence-dialog */}
      {funnet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          {/* Bakgrunnsoverlay */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={avvis}
          />

          {/* Dialogboks */}
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl sm:mx-auto"
            style={{
              background: "rgba(4,10,4,0.96)",
              border: "1px solid rgba(201,168,76,0.25)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Lukk-knapp */}
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
              Geofence oppdaget
            </p>
            <h2 className="text-lg font-bold mb-1" style={{ color: "rgba(232,213,160,0.95)" }}>
              Du er ved {funnet.short_name}
            </h2>
            <p className="text-sm mb-5" style={{ color: "rgba(168,216,168,0.55)" }}>
              Vil du kvittere for dagens sesjon på{" "}
              <span style={{ color: "rgba(232,213,160,0.8)" }}>
                {funnet.planned_duration_h} timer
              </span>
              ?
            </p>

            {/* GPS-indikator */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5 text-xs"
              style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.12)" }}
            >
              <MapPin size={12} style={{ color: "#c9a84c" }} />
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
                className="flex-2 flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isPending ? "rgba(201,168,76,0.3)" : "rgba(201,168,76,0.15)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  color: "#c9a84c",
                }}
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Kvittér
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
