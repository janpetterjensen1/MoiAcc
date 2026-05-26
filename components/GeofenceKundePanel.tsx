"use client";

import { useState, useTransition } from "react";
import { MapPin, Navigation, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { geocodeKundeAction, settKoordinaterAction } from "@/app/actions/geofence";

interface Props {
  kundeId: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
}

export function GeofenceKundePanel({ kundeId, lat, lng, radiusM }: Props) {
  const [isPending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [visManuel, setVisManuel] = useState(false);
  const [manLat, setManLat] = useState(lat != null ? String(lat) : "");
  const [manLng, setManLng] = useState(lng != null ? String(lng) : "");
  const [manRadius, setManRadius] = useState(String(radiusM));
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const [currentRadius, setCurrentRadius] = useState(radiusM);

  function geocode() {
    setFeil(null);
    setResultat(null);
    startTransition(async () => {
      const res = await geocodeKundeAction(kundeId);
      if (res.ok) {
        setCurrentLat(res.lat);
        setCurrentLng(res.lng);
        setManLat(String(res.lat));
        setManLng(String(res.lng));
        setResultat(`Funnet: ${res.display.slice(0, 60)}…`);
      } else {
        setFeil(res.feil);
      }
    });
  }

  function lagreManuel() {
    const la = parseFloat(manLat);
    const lo = parseFloat(manLng);
    const r = parseInt(manRadius) || 300;
    if (isNaN(la) || isNaN(lo)) { setFeil("Ugyldig koordinater"); return; }
    setFeil(null);
    startTransition(async () => {
      const res = await settKoordinaterAction(kundeId, la, lo, r);
      if (res.ok) {
        setCurrentLat(la);
        setCurrentLng(lo);
        setCurrentRadius(r);
        setVisManuel(false);
        setResultat("Koordinater lagret");
      } else {
        setFeil(res.feil);
      }
    });
  }

  const harKoordinater = currentLat != null && currentLng != null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
          <Navigation size={14} className="text-amber-600" />
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Geofencing / Auto-kvittering</h2>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Når du er innenfor radius av denne adressen på riktig dag, tilbys automatisk kvittering.
      </p>

      {/* Status */}
      <div className={`rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2 ${harKoordinater ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        {harKoordinater ? (
          <>
            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
            <div className="text-xs">
              <span className="font-medium text-green-700">Koordinater satt</span>
              <span className="text-green-600 ml-2">
                {currentLat?.toFixed(5)}, {currentLng?.toFixed(5)} · radius {currentRadius} m
              </span>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-medium">Ingen koordinater — geofencing er ikke aktiv</span>
          </>
        )}
      </div>

      {/* Knapper */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={geocode}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
          Geocode fra adresse
        </button>
        <button
          onClick={() => setVisManuel(!visManuel)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Sett manuelt
        </button>

        {harKoordinater && (
          <a
            href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Se på kart ↗
          </a>
        )}
      </div>

      {/* Manuell input */}
      {visManuel && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Breddegrad (lat)</label>
            <input
              type="text"
              value={manLat}
              onChange={(e) => setManLat(e.target.value)}
              placeholder="59.9139"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Lengdegrad (lng)</label>
            <input
              type="text"
              value={manLng}
              onChange={(e) => setManLng(e.target.value)}
              placeholder="10.7522"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Radius (m)</label>
            <input
              type="number"
              value={manRadius}
              onChange={(e) => setManRadius(e.target.value)}
              placeholder="300"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="col-span-3">
            <button
              onClick={lagreManuel}
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Lagre koordinater
            </button>
          </div>
        </div>
      )}

      {/* Tilbakemelding */}
      {resultat && <p className="text-xs text-green-600 mt-2">✓ {resultat}</p>}
      {feil && <p className="text-xs text-red-600 mt-2">✗ {feil}</p>}
    </div>
  );
}
