"use client";

import { useState, useTransition } from "react";
import { MapPin, CheckCircle2, Loader2, Navigation } from "lucide-react";
import { lagreBesoksadresseAction } from "@/app/actions/customers";
import { geocodeKundeAction } from "@/app/actions/geofence";

interface Adresse {
  street: string;
  postal_code: string;
  city: string;
}

interface Props {
  kundeId: string;
  visitAddress: Adresse | null;
  harKoordinater: boolean;
}

export function BesoksadressePanel({ kundeId, visitAddress, harKoordinater }: Props) {
  const [redigerer, setRedigerer] = useState(!visitAddress);
  const [gate, setGate] = useState(visitAddress?.street ?? "");
  const [postnr, setPostnr] = useState(visitAddress?.postal_code ?? "");
  const [poststed, setPoststed] = useState(visitAddress?.city ?? "");
  const [lagretAdr, setLagretAdr] = useState<Adresse | null>(visitAddress);
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeocoding, startGeocoding] = useTransition();

  function lagreAdresse() {
    const fd = new FormData();
    fd.set("visit_street", gate);
    fd.set("visit_postal_code", postnr);
    fd.set("visit_city", poststed);
    startTransition(async () => {
      const res = await lagreBesoksadresseAction(kundeId, fd);
      if (res.ok) {
        setLagretAdr({ street: gate, postal_code: postnr, city: poststed });
        setRedigerer(false);
        setMelding({ type: "ok", tekst: "Adresse lagret" });
        setTimeout(() => setMelding(null), 3000);
      } else {
        setMelding({ type: "feil", tekst: res.feil });
      }
    });
  }

  function geocode() {
    startGeocoding(async () => {
      const res = await geocodeKundeAction(kundeId);
      if (res.ok) {
        setMelding({ type: "ok", tekst: `Koordinater satt (${res.lat.toFixed(4)}, ${res.lng.toFixed(4)})` });
        setTimeout(() => setMelding(null), 4000);
      } else {
        setMelding({ type: "feil", tekst: res.feil });
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
      {/* Tittel */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <MapPin size={14} className="text-blue-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-700">Kundeadresse</h2>
        </div>
        {lagretAdr && !redigerer && (
          <button
            onClick={() => setRedigerer(true)}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            Endre
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Fysisk besøksadresse — brukes for geofencing. Kan avvike fra fakturaadresse.
      </p>

      {/* Vis lagret adresse */}
      {lagretAdr && !redigerer && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-3">
          <p className="text-sm font-medium text-slate-800">{lagretAdr.street}</p>
          <p className="text-sm text-slate-500">{lagretAdr.postal_code} {lagretAdr.city}</p>
        </div>
      )}

      {/* Redigeringsskjema */}
      {redigerer && (
        <div className="space-y-2 mb-3">
          <input
            type="text"
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            placeholder="Gate og nummer"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={postnr}
              onChange={(e) => setPostnr(e.target.value)}
              placeholder="Postnr"
              maxLength={4}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <input
              type="text"
              value={poststed}
              onChange={(e) => setPoststed(e.target.value)}
              placeholder="Poststed"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              onKeyDown={(e) => e.key === "Enter" && lagreAdresse()}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={lagreAdresse}
              disabled={isPending || !gate || !postnr || !poststed}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Lagre adresse
            </button>
            {lagretAdr && (
              <button
                onClick={() => { setRedigerer(false); setGate(lagretAdr.street); setPostnr(lagretAdr.postal_code); setPoststed(lagretAdr.city); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-3 py-2 transition-colors"
              >
                Avbryt
              </button>
            )}
          </div>
        </div>
      )}

      {/* Geocode-knapp */}
      {lagretAdr && !redigerer && (
        <button
          onClick={geocode}
          disabled={isGeocoding}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {isGeocoding
            ? <Loader2 size={12} className="animate-spin" />
            : <Navigation size={12} className={harKoordinater ? "text-green-600" : "text-slate-400"} />
          }
          {harKoordinater ? "Oppdater GPS-punkt" : "Hent GPS-koordinater"}
        </button>
      )}

      {/* Tilbakemelding */}
      {melding && (
        <p className={`text-xs mt-2 ${melding.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {melding.type === "ok" ? "✓" : "✗"} {melding.tekst}
        </p>
      )}
    </div>
  );
}
