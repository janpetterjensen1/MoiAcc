"use client";

import { useState, useEffect } from "react";
import { AKTIVE_PRODUKTER } from "@/lib/products";

interface Props {
  defaultVarighet: number;
  timesats: number;
  eksternVarighet?: number | null;
}

export function ProduktVelger({ defaultVarighet, timesats, eksternVarighet }: Props) {
  const [valgt, setValgt] = useState("");
  const [varighet, setVaright] = useState(defaultVarighet);

  useEffect(() => {
    if (eksternVarighet != null) setVaright(eksternVarighet);
  }, [eksternVarighet]);

  function velgProdukt(navn: string) {
    setValgt(navn);
    const produkt = AKTIVE_PRODUKTER.find((p) => p.navn === navn);
    if (produkt) setVaright(produkt.varighet_h);
  }

  const beregnetBelop = varighet * timesats;

  return (
    <>
      {/* Produktvalg */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Produkt
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AKTIVE_PRODUKTER.map((p) => (
            <button
              key={p.navn}
              type="button"
              onClick={() => velgProdukt(p.navn)}
              className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                valgt === p.navn
                  ? "border-slate-900 bg-slate-900 text-white font-medium"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {p.navn}
            </button>
          ))}
        </div>
        <input type="hidden" name="notat" value={valgt} />
      </div>

      {/* Varighet */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Faktisk varighet (timer)
        </label>
        <input
          name="varighet_h"
          type="number"
          step="0.5"
          min="0.5"
          max="12"
          value={varighet}
          onChange={(e) => setVaright(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg font-semibold text-center shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="text-xs text-slate-400 mt-1 text-center">
          Planlagt: {defaultVarighet}t · kr {beregnetBelop.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </>
  );
}
