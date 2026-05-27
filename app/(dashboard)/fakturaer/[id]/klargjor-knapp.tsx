"use client";

import { useState, useTransition } from "react";
import { SendHorizonal, Loader2, Trash2 } from "lucide-react";
import { sendTilGodkjenningAction, avbrytFakturaAction } from "@/app/actions/invoices";

export function KlargjorKnapp({ fakturaId }: { fakturaId: string }) {
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function sendTilGodkjenning() {
    setFeil(null);
    startTransition(async () => {
      const res = await sendTilGodkjenningAction(fakturaId);
      if (!res.success) setFeil(res.error ?? "Ukjent feil");
    });
  }

  function slettUtkast() {
    if (!confirm("Vil du slette dette utkastet? Handlingen kan ikke angres.")) return;
    startDeleteTransition(async () => {
      await avbrytFakturaAction(fakturaId);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={sendTilGodkjenning}
        disabled={isPending || isDeleting}
        className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
        Send til godkjenning
      </button>
      {feil && <p className="text-xs text-red-600">{feil}</p>}
      <button
        onClick={slettUtkast}
        disabled={isPending || isDeleting}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
      >
        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        Slett utkast
      </button>
    </div>
  );
}
