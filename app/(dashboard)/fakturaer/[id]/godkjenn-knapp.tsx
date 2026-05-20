"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { godkjennOgSendFaktura, avbrytFakturaAction } from "@/app/actions/invoices";

export function GodkjennKnapp({ fakturaId }: { fakturaId: string }) {
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAvbryt, setIsAvbryt] = useState(false);
  const router = useRouter();

  async function handleGodkjenn() {
    setFeil(null);
    startTransition(async () => {
      const res = await godkjennOgSendFaktura(fakturaId);
      if (res.success) {
        router.refresh();
      } else {
        setFeil(res.error ?? "Feil ved godkjenning");
      }
    });
  }

  async function handleAvbryt() {
    setIsAvbryt(true);
    startTransition(async () => {
      await avbrytFakturaAction(fakturaId);
    });
  }

  return (
    <div className="space-y-2">
      {feil && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {feil}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleGodkjenn}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {isPending && !isAvbryt ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CheckCircle2 size={15} />
          )}
          Godkjenn og send
        </button>
        <button
          onClick={handleAvbryt}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <X size={14} />
          Avbryt
        </button>
      </div>
      <p className="text-[10px] text-amber-600 text-center">
        Godkjenning setter approved_at og er lovpålagt (bokfl. §5). Kan ikke angres.
      </p>
    </div>
  );
}
