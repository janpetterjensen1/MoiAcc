"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";
import { sendPurringAction } from "@/app/actions/invoices";

export function PurringKnapp({ fakturaId }: { fakturaId: string }) {
  const [status, setStatus] = useState<"idle" | "sendt" | "feil">("idle");
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePurring() {
    if (!confirm("Send purring på e-post til kunden?")) return;
    setStatus("idle");
    setFeilmelding(null);
    startTransition(async () => {
      const res = await sendPurringAction(fakturaId);
      if (res.success) {
        setStatus("sendt");
      } else {
        setStatus("feil");
        setFeilmelding(res.error ?? "Ukjent feil");
      }
    });
  }

  return (
    <div className="space-y-2">
      {status === "feil" && feilmelding && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{feilmelding}</p>
      )}
      {status === "sendt" && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Purring sendt
        </p>
      )}
      <button
        onClick={handlePurring}
        disabled={isPending || status === "sendt"}
        className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        Send purring
      </button>
    </div>
  );
}
