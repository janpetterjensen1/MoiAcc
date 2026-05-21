"use client";

import { useState, useEffect } from "react";
import { Target } from "lucide-react";

const STORAGE_KEY = "budsjett_aars_maal";

function kr(v: number) {
  return v.toLocaleString("nb-NO", { maximumFractionDigits: 0 }) + " kr";
}

interface Props {
  ytdInntekt: number;
  aar: number;
}

export function BudsjettWidget({ ytdInntekt, aar }: Props) {
  const [maal, setMaal] = useState(0);
  const [input, setInput] = useState("");
  const [redigerer, setRedigerer] = useState(false);

  useEffect(() => {
    const lagret = localStorage.getItem(`${STORAGE_KEY}_${aar}`);
    if (lagret) {
      const v = Number(lagret);
      setMaal(v);
      setInput(v === 0 ? "" : String(v));
    }
  }, [aar]);

  function lagreMaal() {
    const v = parseInt(input.replace(/\s/g, "").replace(",", "")) || 0;
    setMaal(v);
    localStorage.setItem(`${STORAGE_KEY}_${aar}`, String(v));
    setRedigerer(false);
  }

  const mndNummer = new Date().getMonth() + 1;
  const mndGjenstaende = 12 - mndNummer + 1;
  const prosent = maal > 0 ? Math.min(100, Math.round((ytdInntekt / maal) * 100)) : 0;
  const mangler = Math.max(0, maal - ytdInntekt);
  const mndBehov = mndGjenstaende > 0 ? Math.ceil(mangler / mndGjenstaende) : 0;

  const fargeBar = prosent >= 100 ? "bg-emerald-500" : prosent >= 60 ? "bg-blue-500" : prosent >= 30 ? "bg-amber-400" : "bg-slate-300";

  if (maal === 0 && !redigerer) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Target size={16} />
          <span className="text-sm">Sett inntektsmål for {aar}</span>
        </div>
        <button
          onClick={() => setRedigerer(true)}
          className="text-xs text-slate-600 underline hover:text-slate-900"
        >
          Legg til
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
            <Target size={13} className="text-violet-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Inntektsmål {aar}</span>
        </div>
        <button
          onClick={() => setRedigerer(!redigerer)}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          {redigerer ? "Avbryt" : "Endre"}
        </button>
      </div>

      {redigerer ? (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="f.eks. 800000"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            onKeyDown={(e) => e.key === "Enter" && lagreMaal()}
            autoFocus
          />
          <button
            onClick={lagreMaal}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Lagre
          </button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{kr(ytdInntekt)}</span>
              <span className="font-medium">{prosent}%</span>
              <span>{kr(maal)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${fargeBar}`}
                style={{ width: `${prosent}%` }}
              />
            </div>
          </div>

          {/* Undertekst */}
          {mangler > 0 ? (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{kr(mangler)}</span> gjenstår ·{" "}
              ca. <span className="font-medium text-slate-700">{kr(mndBehov)}/mnd</span> de neste {mndGjenstaende} månedene
            </p>
          ) : (
            <p className="text-xs text-emerald-700 font-medium">✓ Inntektsmål nådd!</p>
          )}
        </>
      )}
    </div>
  );
}
