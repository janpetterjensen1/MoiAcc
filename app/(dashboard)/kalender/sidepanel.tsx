"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import {
  genererAarsplanAction,
  lagreUkemonsterAction,
  slettUkemonsterAction,
  leggTilFerieAction,
  slettFerieAction,
} from "@/app/actions/calendar";
import { formatNorskDato } from "@/lib/utils";

const UKEDAGER = [
  { nr: 1, navn: "Mandag" },
  { nr: 2, navn: "Tirsdag" },
  { nr: 3, navn: "Onsdag" },
  { nr: 4, navn: "Torsdag" },
  { nr: 5, navn: "Fredag" },
];

interface Kunde {
  id: string;
  short_name: string;
}

interface Ferie {
  id: string;
  from_date: string;
  to_date: string;
  description: string;
}

interface Props {
  kunder: Kunde[];
  ferieperioder: Ferie[];
  arValgt: number;
}

export function KalenderSidepanel({ kunder, ferieperioder, arValgt }: Props) {
  const [isPending, startTransition] = useTransition();
  const [melding, setMelding] = useState<string | null>(null);

  function visResultat(tekst: string) {
    setMelding(tekst);
    setTimeout(() => setMelding(null), 4000);
  }

  async function handleGenerer() {
    startTransition(async () => {
      const res = await genererAarsplanAction(arValgt);
      if (res.success) {
        visResultat(`✓ ${res.antall} sesjoner generert for ${arValgt}`);
      } else {
        visResultat(`✗ ${res.error}`);
      }
    });
  }

  async function handleSlettFerie(id: string) {
    startTransition(async () => {
      await slettFerieAction(id);
    });
  }

  return (
    <div className="w-full lg:w-72 space-y-5 shrink-0">
      {/* Årsplan-generator */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Årsplan-generator
        </h2>
        {melding && (
          <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-3">
            {melding}
          </div>
        )}
        <button
          onClick={handleGenerer}
          disabled={isPending}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          Generer {arValgt}
        </button>
        <p className="text-[10px] text-slate-400 mt-2">
          Oppretter planlagte sesjoner basert på ukemønstre. Eksisterende rader beholdes.
        </p>
      </div>

      {/* Ukemønster-editor */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Ukemønstre
        </h2>
        <form
          action={async (fd) => { await lagreUkemonsterAction(fd); }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kunde</label>
            <select
              name="customer_id"
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {kunder.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.short_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ukedag</label>
              <select
                name="weekday"
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {UKEDAGER.map((d) => (
                  <option key={d.nr} value={d.nr}>
                    {d.navn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Timer</label>
              <input
                name="duration_h"
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                defaultValue="1"
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Starttid <span className="text-slate-400">(valgfritt — for geofence)</span>
            </label>
            <input
              name="start_time"
              type="time"
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 w-full justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            <Plus size={14} />
            Legg til mønster
          </button>
        </form>
      </div>

      {/* Ferieperioder */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Ferieperioder
        </h2>

        {ferieperioder.length > 0 && (
          <div className="space-y-2 mb-3">
            {ferieperioder.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-2 text-xs bg-blue-50 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="font-medium text-slate-700">{f.description}</p>
                  <p className="text-slate-500">
                    {formatNorskDato(f.from_date)} – {formatNorskDato(f.to_date)}
                  </p>
                </div>
                <button
                  onClick={() => handleSlettFerie(f.id)}
                  className="text-slate-400 hover:text-red-500 mt-0.5 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form action={async (fd) => { await leggTilFerieAction(fd); }} className="space-y-2">
          <input
            name="beskrivelse"
            type="text"
            placeholder="Beskrivelse, f.eks. Sommerferie"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Fra</label>
              <input
                name="fra_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Til</label>
              <input
                name="til_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 w-full justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            <Plus size={14} />
            Legg til ferie
          </button>
        </form>
      </div>
    </div>
  );
}
