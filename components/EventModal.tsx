"use client";

import { useRef, useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { loggAdHocEvent } from "@/app/actions/sessions";

interface Kunde {
  id: string;
  short_name: string;
}

interface Props {
  kunder: Kunde[];
}

const VARIGHETER = [
  { label: "60 min", verdi: "1.0" },
  { label: "90 min", verdi: "1.5" },
  { label: "120 min", verdi: "2.0" },
  { label: "150 min", verdi: "2.5" },
];

export function EventModal({ kunder }: Props) {
  const [open, setOpen] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const iDagStr = new Date().toISOString().slice(0, 10);

  function lukk() {
    setOpen(false);
    setFeil(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFeil(null);

    startTransition(async () => {
      const res = await loggAdHocEvent(fd);
      if (res?.error) {
        setFeil(res.error);
        return;
      }
      lukk();
      formRef.current?.reset();
      router.refresh();
    });
  }

  function handleKundeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "__ny__") {
      e.target.value = "";
      router.push("/kunder/ny");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
      >
        <Plus size={15} />
        Ny event
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={lukk}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Ny event</h2>
              <button
                onClick={lukk}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
              {feil && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {feil}
                </div>
              )}

              {/* Dato */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Dato
                </label>
                <input
                  type="date"
                  name="dato"
                  defaultValue={iDagStr}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Kunde */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Kunde
                </label>
                <select
                  name="customer_id"
                  required
                  onChange={handleKundeChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Velg kunde…</option>
                  {kunder.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.short_name}
                    </option>
                  ))}
                  <option disabled className="text-slate-300">──────────</option>
                  <option value="__ny__">+ Ny kunde…</option>
                </select>
              </div>

              {/* Varighet */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Varighet
                </label>
                <select
                  name="varighet_h"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {VARIGHETER.map((v) => (
                    <option key={v.verdi} value={v.verdi}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tekst (valgfri) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Tekst{" "}
                  <span className="font-normal text-slate-400">(valgfri)</span>
                </label>
                <input
                  type="text"
                  name="notat"
                  placeholder="f.eks. Spinning Maraton, Utendørs…"
                  maxLength={120}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Lagrer…" : "Logg event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
