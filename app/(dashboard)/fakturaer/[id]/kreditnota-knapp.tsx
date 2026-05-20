"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { kreditnotatAction } from "@/app/actions/invoices";

export function KreditnotaKnapp({ fakturaId }: { fakturaId: string }) {
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleKreditnota() {
    if (!confirm("Opprette kreditnota? Dette markerer fakturaen som kreditert og kan ikke angres.")) return;
    setFeil(null);
    startTransition(async () => {
      const res = await kreditnotatAction(fakturaId);
      if (res.success && res.nyId) {
        router.push(`/fakturaer/${res.nyId}`);
      } else {
        setFeil(res.error ?? "Ukjent feil");
      }
    });
  }

  return (
    <div className="space-y-2">
      {feil && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{feil}</p>
      )}
      <button
        onClick={handleKreditnota}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
        Opprett kreditnota
      </button>
    </div>
  );
}
