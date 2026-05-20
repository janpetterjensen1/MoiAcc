"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "skatt_annen_inntekt";

// Norske skattesatser 2026 (basert på 2025-satser)
const PERSONFRADRAG = 108_550;
const SATS_ALMINNELIG = 0.22;
const SATS_TRYGD_NAERING = 0.109;

const TRINN = [
  { fra: 0,         til: 208_050,   sats: 0 },
  { fra: 208_050,   til: 292_850,   sats: 0.017 },
  { fra: 292_850,   til: 670_000,   sats: 0.04 },
  { fra: 670_000,   til: 937_900,   sats: 0.136 },
  { fra: 937_900,   til: 1_350_000, sats: 0.166 },
  { fra: 1_350_000, til: Infinity,  sats: 0.176 },
];

function beregnTrinnskatt(inntekt: number): number {
  return TRINN.reduce((sum, t) => {
    if (inntekt <= t.fra) return sum;
    return sum + (Math.min(inntekt, t.til) - t.fra) * t.sats;
  }, 0);
}

function kr(v: number) {
  return v.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";
}

interface Props {
  fakturainntekt: number;
  utgifter: number;
  aar: number;
}

export function SkattOversikt({ fakturainntekt, utgifter, aar }: Props) {
  const [annenInntekt, setAnnenInntekt] = useState(0);
  const [annenInntektInput, setAnnenInntektInput] = useState("");

  useEffect(() => {
    const lagret = localStorage.getItem(`${STORAGE_KEY}_${aar}`);
    if (lagret) {
      const v = Number(lagret);
      setAnnenInntekt(v);
      setAnnenInntektInput(v === 0 ? "" : String(v));
    }
  }, [aar]);

  function oppdaterAnnenInntekt(val: string) {
    setAnnenInntektInput(val);
    const v = parseFloat(val.replace(/\s/g, "").replace(",", ".")) || 0;
    setAnnenInntekt(v);
    localStorage.setItem(`${STORAGE_KEY}_${aar}`, String(v));
  }

  // Beregninger
  const naeringsinntekt = Math.max(0, fakturainntekt - utgifter);
  const totalPersoninntekt = naeringsinntekt + annenInntekt;
  const alminneligInntekt = Math.max(0, totalPersoninntekt - PERSONFRADRAG);

  const trygdeavgift = Math.round(naeringsinntekt * SATS_TRYGD_NAERING);
  const alminneligSkatt = Math.round(alminneligInntekt * SATS_ALMINNELIG);
  const trinnskatt = Math.round(beregnTrinnskatt(totalPersoninntekt));
  const totalSkatt = trygdeavgift + alminneligSkatt + trinnskatt;

  const effektivSats = totalPersoninntekt > 0
    ? ((totalSkatt / totalPersoninntekt) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">

      {/* Inntekter */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Inntekter {aar}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <Row label="Fakturainntekt (sendt/betalt)" verdi={fakturainntekt} />
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Annen inntekt (lønn, dagpenger o.l.)</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={annenInntektInput}
                onChange={(e) => oppdaterAnnenInntekt(e.target.value)}
                placeholder="0"
                className="w-36 text-right rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <span className="text-sm text-slate-500 w-4">kr</span>
            </div>
          </div>
          <Row label="Sum inntekt" verdi={fakturainntekt + annenInntekt} bold />
        </div>
      </section>

      {/* Fradrag */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Fradrag</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <Row label="Næringskostnader (fra utgifter)" verdi={utgifter} />
          <Row label="Personfradrag" verdi={PERSONFRADRAG} />
        </div>
      </section>

      {/* Skatteberegning */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Beregnet skatt</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <Row label={`Trygdeavgift næring (${(SATS_TRYGD_NAERING * 100).toFixed(1)} % av næringsinntekt)`} verdi={trygdeavgift} />
          <Row label={`Alminnelig inntektsskatt (${(SATS_ALMINNELIG * 100).toFixed(0)} % av ${kr(alminneligInntekt)})`} verdi={alminneligSkatt} />
          <Row label="Trinnskatt" verdi={trinnskatt} />
          <Row label={`Estimert total skatt (effektiv sats ${effektivSats} %)`} verdi={totalSkatt} bold />
        </div>
      </section>

      {/* Avsetning */}
      <section className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-amber-100">
          <h2 className="text-sm font-semibold text-amber-800">Anbefalt skatteavsetning</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-900">{kr(totalSkatt)}</p>
            <p className="text-xs text-amber-700 mt-1">
              Sett av dette beløpet til skatteoppgjøret
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-700">Gjenstående inntekt</p>
            <p className="text-lg font-semibold text-amber-900">
              {kr(Math.max(0, fakturainntekt + annenInntekt - utgifter - totalSkatt))}
            </p>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-400 text-center">
        Estimat basert på 2026-satser. Konsulter regnskapsfører for nøyaktig skatteberegning.
      </p>
    </div>
  );
}

function Row({ label, verdi, bold }: { label: string; verdi: number; bold?: boolean }) {
  return (
    <div className={`px-5 py-3 flex items-center justify-between ${bold ? "bg-slate-50" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-900"}`}>{kr(verdi)}</span>
    </div>
  );
}
