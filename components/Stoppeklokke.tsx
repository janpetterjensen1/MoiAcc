"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, RotateCcw } from "lucide-react";

interface Props {
  onFerdig: (timer: number) => void;
}

function formaterTid(sekunder: number): string {
  const h = Math.floor(sekunder / 3600);
  const m = Math.floor((sekunder % 3600) / 60);
  const s = sekunder % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function Stoppeklokke({ onFerdig }: Props) {
  const [sekunder, setSekunder] = useState(0);
  const [kjorer, setKjorer] = useState(false);
  const [stoppet, setStoppet] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (kjorer) {
      intervalRef.current = setInterval(() => setSekunder((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [kjorer]);

  function start() { setKjorer(true); setStoppet(false); }
  function stopp() {
    setKjorer(false);
    setStoppet(true);
    const timer = Math.round((sekunder / 3600) * 2) / 2; // rund til nærmeste 0.5t
    onFerdig(Math.max(0.5, timer));
  }
  function nullstill() { setKjorer(false); setSekunder(0); setStoppet(false); }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Stoppeklokke</p>
      <div className="flex items-center justify-between">
        <span className={`text-3xl font-mono font-bold tabular-nums ${kjorer ? "text-slate-900" : stoppet ? "text-emerald-700" : "text-slate-400"}`}>
          {formaterTid(sekunder)}
        </span>
        <div className="flex gap-2">
          {!kjorer && !stoppet && (
            <button
              type="button"
              onClick={start}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              <Play size={14} /> Start
            </button>
          )}
          {kjorer && (
            <button
              type="button"
              onClick={stopp}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Square size={14} /> Stopp
            </button>
          )}
          {stoppet && (
            <>
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Play size={13} /> Fortsett
              </button>
              <button
                type="button"
                onClick={nullstill}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      {stoppet && (
        <p className="text-xs text-emerald-700 mt-2">
          ✓ Varigheten er overført til skjemaet — rundet til nærmeste halvtime
        </p>
      )}
    </div>
  );
}
