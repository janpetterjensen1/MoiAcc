"use client";

import { useState, useTransition } from "react";
import { Wand2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { genererAlleUtkastAction } from "@/app/actions/invoices";

export function GenererAlleUtkastKnapp() {
  const [resultat, setResultat] = useState<{
    opprettet: string[];
    hoppetOver: string[];
    feil: { kunde: string; feil: string }[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function kjor() {
    const maned = new Date().toLocaleString("nb-NO", { month: "long" });
    if (!confirm(`Generer fakturautkast for alle aktive kunder for ${maned}?`)) return;
    setResultat(null);
    startTransition(async () => {
      const res = await genererAlleUtkastAction();
      setResultat(res);
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={kjor}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        Generer månedsutkast
      </button>

      {resultat && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2 max-w-sm">
          {resultat.opprettet.length > 0 && (
            <div className="flex items-start gap-2 text-green-700">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>Opprettet: {resultat.opprettet.join(", ")}</span>
            </div>
          )}
          {resultat.hoppetOver.length > 0 && (
            <div className="text-slate-400 text-xs">
              Ingen timer: {resultat.hoppetOver.join(", ")}
            </div>
          )}
          {resultat.feil.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-red-600">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{f.kunde}: {f.feil}</span>
            </div>
          ))}
          {resultat.opprettet.length === 0 && resultat.feil.length === 0 && (
            <p className="text-slate-400">Ingen nye utkast ble opprettet.</p>
          )}
        </div>
      )}
    </div>
  );
}
