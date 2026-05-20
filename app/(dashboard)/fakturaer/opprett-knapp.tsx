"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { opprettFakturaForslag } from "@/app/actions/invoices";

interface Kunde {
  id: string;
  short_name: string;
}

export function OpprettFakturaKnapp({ kunder }: { kunder: Kunde[] }) {
  const [visVelger, setVisVelger] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function velgKunde(id: string) {
    setFeil(null);
    startTransition(async () => {
      const res = await opprettFakturaForslag(id);
      if (res.success && res.fakturaId) {
        router.push(`/fakturaer/${res.fakturaId}`);
      } else {
        setFeil(res.error ?? "Ukjent feil");
        setVisVelger(false);
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setVisVelger((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Ny faktura
      </button>

      {feil && (
        <p className="absolute right-0 top-12 text-xs text-red-600 bg-white border border-red-200 rounded-lg px-3 py-2 w-56 z-10">
          {feil}
        </p>
      )}

      {visVelger && (
        <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-52 py-1 overflow-hidden">
          <p className="text-xs text-slate-400 px-3 py-2 border-b border-slate-100">
            Velg kunde
          </p>
          {kunder.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-3">Ingen aktive kunder</p>
          )}
          {kunder.map((k) => (
            <button
              key={k.id}
              onClick={() => velgKunde(k.id)}
              className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {k.short_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
