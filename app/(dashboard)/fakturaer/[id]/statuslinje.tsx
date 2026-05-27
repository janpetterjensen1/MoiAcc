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

function DatoKnapp({
  label,
  dato,
  ferdig,
  farge,
  ekstra,
  aktiv,
  onBekreft,
}: {
  label: string;
  dato: string | null;
  ferdig: boolean;
  farge: "green" | "blue" | "red" | "purple";
  ekstra?: string;
  aktiv: boolean;
  onBekreft: (dato: string) => Promise<void>;
}) {
  const [apent, setApent] = useState(false);
  const [valgtDato, setValgtDato] = useState(iDagStr());
  const [isPending, startTransition] = useTransition();

  const fargeKlasser = {
    green:  { dot: "bg-green-500 border-green-500",   tekst: "text-green-600" },
    blue:   { dot: "bg-blue-500 border-blue-500",     tekst: "text-blue-600" },
    red:    { dot: "bg-red-500 border-red-500",       tekst: "text-red-600" },
    purple: { dot: "bg-purple-500 border-purple-500", tekst: "text-purple-600" },
  };
  const f = fargeKlasser[farge];

  function bekreft() {
    startTransition(async () => {
      await onBekreft(valgtDato);
      setApent(false);
    });
  }

  return (
    <div className="flex flex-col items-center flex-1 relative z-10">
      <button
        onClick={() => aktiv && !ferdig && setApent((v) => !v)}
        disabled={ferdig || !aktiv}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white transition-all
          ${ferdig ? f.dot : aktiv ? "border-slate-300 hover:border-blue-400 cursor-pointer" : "border-slate-200 cursor-default"}`}
      >
        {ferdig ? (
          <CheckCircle2 size={16} className="text-white" />
        ) : (
          <Circle size={10} className={aktiv ? "text-slate-400 fill-slate-100" : "text-slate-300 fill-slate-200"} />
        )}
      </button>

      <p className={`mt-2 text-xs font-semibold ${ferdig ? f.tekst : aktiv ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </p>

      {dato ? (
        <p className="text-[10px] text-slate-400 mt-0.5 text-center">
          {formatNorskDato(dato.slice(0, 10))}
        </p>
      ) : (
        <p className="text-[10px] text-slate-300 mt-0.5">—</p>
      )}

      {ekstra && (
        <span className="mt-1 text-[9px] font-semibold text-red-500 uppercase tracking-wide">
          {ekstra}
        </span>
      )}

      {/* Inline datoplukker */}
      {apent && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-44">
          <p className="text-xs font-semibold text-slate-700 mb-2">{label} dato</p>
          <input
            type="date"
            value={valgtDato}
            onChange={(e) => setValgtDato(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setApent(false)}
              className="flex-1 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              onClick={bekreft}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-1"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : "Bekreft"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FakturaStatuslinje({ fakturaId, createdAt, sentAt, paidAt, status }: Props) {
  const erKreditert = status === "credited";
  const erForfalt = status === "overdue";

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4">
      <div className="flex items-start justify-between relative">
        {/* Forbindelseslinje */}
        <div className="absolute top-3.5 left-[calc(16.666%)] right-[calc(16.666%)] h-px bg-slate-200" />

        {/* Produsert — aldri klikkbar, alltid ferdig */}
        <div className="flex flex-col items-center flex-1 relative z-10">
          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-green-500 border-green-500">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <p className="mt-2 text-xs font-semibold text-green-600">Produsert</p>
          <p className="text-[10px] text-slate-400 mt-0.5 text-center">
            {formatNorskDato(createdAt.slice(0, 10))}
          </p>
        </div>

        {/* Sendt */}
        <DatoKnapp
          label="Sendt"
          dato={sentAt}
          ferdig={!!sentAt}
          farge={erForfalt ? "red" : "blue"}
          ekstra={erForfalt ? "Forfalt" : undefined}
          aktiv={!erKreditert}
          onBekreft={(dato) => markerSendtAction(fakturaId, dato).then(() => {})}
        />

        {/* Betalt / Kreditert */}
        <DatoKnapp
          label={erKreditert ? "Kreditert" : "Betalt"}
          dato={paidAt}
          ferdig={!!paidAt || erKreditert}
          farge={erKreditert ? "purple" : "green"}
          aktiv={!!sentAt && !erKreditert}
          onBekreft={(dato) => markerBetaltDatoAction(fakturaId, dato).then(() => {})}
        />
      </div>
    </div>
  );
}
