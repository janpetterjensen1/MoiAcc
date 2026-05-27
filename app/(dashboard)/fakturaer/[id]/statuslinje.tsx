"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { markerSendtAction, markerBetaltDatoAction } from "@/app/actions/invoices";
import { formatNorskDato } from "@/lib/utils";

interface Props {
  fakturaId: string;
  createdAt: string;
  sentAt: string | null;
  paidAt: string | null;
  status: string;
}

function iDagStr() {
  return new Date().toISOString().slice(0, 10);
}

export function FakturaStatuslinje({ fakturaId, createdAt, sentAt, paidAt, status }: Props) {
  const [apentSteg, setApentSteg] = useState<"sendt" | "betalt" | null>(null);
  const [valgtDato, setValgtDato] = useState(iDagStr());
  const [isPending, startTransition] = useTransition();

  const erKreditert = status === "credited";
  const erForfalt   = status === "overdue";

  const sendt_aktiv  = !erKreditert && !sentAt;
  const betalt_aktiv = !!sentAt && !erKreditert && !paidAt;

  function aapne(steg: "sendt" | "betalt") {
    setValgtDato(iDagStr());
    setApentSteg((v) => (v === steg ? null : steg));
  }

  function bekreft() {
    if (!apentSteg) return;
    startTransition(async () => {
      if (apentSteg === "sendt") await markerSendtAction(fakturaId, valgtDato);
      else await markerBetaltDatoAction(fakturaId, valgtDato);
      setApentSteg(null);
    });
  }

  const farger = {
    green:  { dot: "bg-green-500 border-green-500",   tekst: "text-green-600" },
    blue:   { dot: "bg-blue-500 border-blue-500",     tekst: "text-blue-600" },
    red:    { dot: "bg-red-500 border-red-500",       tekst: "text-red-600" },
    purple: { dot: "bg-purple-500 border-purple-500", tekst: "text-purple-600" },
  };

  type FargeKey = keyof typeof farger;

  function Steg({
    label, dato, ferdig, farge, ekstra, klikkbar, stegId,
  }: {
    label: string; dato: string | null; ferdig: boolean;
    farge: FargeKey; ekstra?: string; klikkbar: boolean;
    stegId: "sendt" | "betalt";
  }) {
    const f = farger[farge];
    const erApent = apentSteg === stegId;
    return (
      <div className="flex flex-col items-center flex-1 relative z-10">
        <button
          type="button"
          onClick={() => klikkbar && aapne(stegId)}
          disabled={!klikkbar}
          title={klikkbar ? `Registrer ${label.toLowerCase()}` : undefined}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white transition-all
            ${ferdig ? f.dot : klikkbar
              ? `border-slate-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer ${erApent ? "ring-2 ring-blue-300" : ""}`
              : "border-slate-200 cursor-default"}`}
        >
          {ferdig
            ? <CheckCircle2 size={16} className="text-white" />
            : <Circle size={10} className={klikkbar ? "text-slate-400 fill-slate-100" : "text-slate-300 fill-slate-200"} />}
        </button>
        <p className={`mt-2 text-xs font-semibold ${ferdig ? f.tekst : klikkbar ? "text-slate-500" : "text-slate-400"}`}>
          {label}
        </p>
        {dato
          ? <p className="text-[10px] text-slate-400 mt-0.5 text-center">{formatNorskDato(dato.slice(0, 10))}</p>
          : <p className="text-[10px] mt-0.5">{klikkbar ? <span className="text-blue-400 underline underline-offset-2 cursor-pointer" onClick={() => aapne(stegId)}>Registrer</span> : <span className="text-slate-300">—</span>}</p>}
        {ekstra && <span className="mt-1 text-[9px] font-semibold text-red-500 uppercase tracking-wide">{ekstra}</span>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4">
      {/* Tidslinje */}
      <div className="flex items-start justify-between relative">
        <div className="absolute top-3.5 left-[calc(16.666%)] right-[calc(16.666%)] h-px bg-slate-200" />

        {/* Produsert */}
        <div className="flex flex-col items-center flex-1 relative z-10">
          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-green-500 border-green-500">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <p className="mt-2 text-xs font-semibold text-green-600">Produsert</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatNorskDato(createdAt.slice(0, 10))}</p>
        </div>

        <Steg label="Sendt"  dato={sentAt}  ferdig={!!sentAt}             farge={erForfalt ? "red" : "blue"}   ekstra={erForfalt ? "Forfalt" : undefined} klikkbar={sendt_aktiv}  stegId="sendt"  />
        <Steg label={erKreditert ? "Kreditert" : "Betalt"} dato={paidAt} ferdig={!!paidAt || erKreditert} farge={erKreditert ? "purple" : "green"} klikkbar={betalt_aktiv} stegId="betalt" />
      </div>

      {/* Datoplukker — vises under tidslinjen */}
      {apentSteg && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {apentSteg === "sendt" ? "Registrer sendt dato" : "Registrer betalt dato"}
          </p>
          <input
            type="date"
            value={valgtDato}
            onChange={(e) => setValgtDato(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setApentSteg(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={bekreft}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              Bekreft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
