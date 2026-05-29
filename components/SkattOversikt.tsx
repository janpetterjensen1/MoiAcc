"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { lagreSkattConfig } from "@/app/actions/skatt";

// Norske skattesatser 2026
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

function forskuddTerminer(year: number) {
  return [
    { nr: 1, dato: `${year}-03-15`, label: "15. mars" },
    { nr: 2, dato: `${year}-06-15`, label: "15. juni" },
    { nr: 3, dato: `${year}-09-15`, label: "15. sept" },
    { nr: 4, dato: `${year}-12-15`, label: "15. des" },
  ];
}

interface Props {
  fakturainntekt: number;
  utgifter: number;
  aar: number;
  initAnnenInntekt: number;
  initForskuddsskatt: number;
}

const inputKlasse = "w-36 text-right rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]";
const inputStyle = {
  background: "rgba(8,22,8,0.6)",
  border: "1px solid rgba(45,122,45,0.3)",
  color: "rgba(220,240,220,0.9)",
};

export function SkattOversikt({ fakturainntekt, utgifter, aar, initAnnenInntekt, initForskuddsskatt }: Props) {
  const [annenInntekt, setAnnenInntekt] = useState(initAnnenInntekt);
  const [annenInput, setAnnenInput] = useState(initAnnenInntekt > 0 ? String(initAnnenInntekt) : "");
  const [forskuddInput, setForskuddInput] = useState(initForskuddsskatt > 0 ? String(initForskuddsskatt) : "");
  const [forskuddUtskrevet, setForskuddUtskrevet] = useState(initForskuddsskatt);
  const [lagretStatus, setLagretStatus] = useState<"idle" | "lagrer" | "ok">("idle");
  const [isPending, startTransition] = useTransition();

  function lagreEndringer(nyAnnen: number, nyForskudd: number) {
    setLagretStatus("lagrer");
    startTransition(async () => {
      await lagreSkattConfig(aar, nyAnnen, nyForskudd);
      setLagretStatus("ok");
      setTimeout(() => setLagretStatus("idle"), 2000);
    });
  }

  function handleAnnen(val: string) {
    setAnnenInput(val);
    const v = parseFloat(val.replace(/\s/g, "").replace(",", ".")) || 0;
    setAnnenInntekt(v);
    lagreEndringer(v, forskuddUtskrevet);
  }

  function handleForskudd(val: string) {
    setForskuddInput(val);
    const v = parseFloat(val.replace(/\s/g, "").replace(",", ".")) || 0;
    setForskuddUtskrevet(v);
    lagreEndringer(annenInntekt, v);
  }

  // Beregninger
  const naeringsinntekt   = Math.max(0, fakturainntekt - utgifter);
  const totalPersoninntekt = naeringsinntekt + annenInntekt;
  const alminneligInntekt  = Math.max(0, totalPersoninntekt - PERSONFRADRAG);
  const trygdeavgift       = Math.round(naeringsinntekt * SATS_TRYGD_NAERING);
  const alminneligSkatt    = Math.round(alminneligInntekt * SATS_ALMINNELIG);
  const trinnskatt         = Math.round(beregnTrinnskatt(totalPersoninntekt));
  const totalSkatt         = trygdeavgift + alminneligSkatt + trinnskatt;
  const effektivSats       = totalPersoninntekt > 0
    ? ((totalSkatt / totalPersoninntekt) * 100).toFixed(1) : "0.0";

  const perTermin = Math.round(totalSkatt / 4);
  const gapForskudd = totalSkatt - forskuddUtskrevet;
  const terminer = forskuddTerminer(aar);
  const iDag = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">

      {/* Lagreindikator */}
      {lagretStatus !== "idle" && (
        <div className="text-xs text-center" style={{ color: lagretStatus === "ok" ? "#4ade80" : "rgba(201,168,76,0.7)" }}>
          {lagretStatus === "lagrer" ? "Lagrer…" : "✓ Lagret"}
        </div>
      )}

      {/* Inntekter */}
      <section className="glass-card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.15)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(168,216,168,0.5)" }}>Inntekter {aar}</h2>
        </div>
        <div style={{ divide: "rgba(45,122,45,0.1)" }}>
          <Row label="Fakturainntekt (sendt/betalt)" verdi={fakturainntekt} />
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(45,122,45,0.08)" }}>
            <div>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Annen inntekt</span>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
                Annen inntekt, ikke fakturert gjennom MoiAcc, for å beregne skatt
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={annenInput}
                onChange={(e) => handleAnnen(e.target.value)}
                placeholder="0"
                className={inputKlasse}
                style={inputStyle}
              />
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>kr</span>
            </div>
          </div>
          <Row label="Sum inntekt" verdi={fakturainntekt + annenInntekt} bold />
        </div>
      </section>

      {/* Fradrag */}
      <section className="glass-card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.15)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(168,216,168,0.5)" }}>Fradrag</h2>
        </div>
        <Row label="Næringskostnader (fra utgifter)" verdi={utgifter} />
        <Row label="Personfradrag" verdi={PERSONFRADRAG} />
      </section>

      {/* Skatteberegning */}
      <section className="glass-card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.15)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(168,216,168,0.5)" }}>Beregnet skatt</h2>
        </div>
        <Row label={`Trygdeavgift næring (${(SATS_TRYGD_NAERING * 100).toFixed(1)} %)`} verdi={trygdeavgift} />
        <Row label={`Alminnelig inntektsskatt (22 % av ${kr(alminneligInntekt)})`} verdi={alminneligSkatt} />
        <Row label="Trinnskatt" verdi={trinnskatt} />
        <Row label={`Estimert total skatt (effektiv sats ${effektivSats} %)`} verdi={totalSkatt} bold />
      </section>

      {/* Forskuddsskatt */}
      <section className="glass-card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.15)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(168,216,168,0.5)" }}>Forskuddsskatt {aar}</h2>
        </div>

        {/* Utskrevet fra Altinn */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(45,122,45,0.08)" }}>
          <div>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Utskrevet fra Altinn</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
              Finn beløpet i Altinn under Skatt og avgift
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={forskuddInput}
              onChange={(e) => handleForskudd(e.target.value)}
              placeholder="0"
              className={inputKlasse}
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>kr</span>
          </div>
        </div>

        {/* Gap */}
        {forskuddUtskrevet > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.08)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {gapForskudd > 0 ? "Estimert underbetaling" : "Estimert overbetaling"}
              </span>
              <span className="text-sm font-semibold" style={{ color: gapForskudd > 5000 ? "#f87171" : gapForskudd > 0 ? "#c9a84c" : "#4ade80" }}>
                {gapForskudd > 0 ? "+" : ""}{kr(Math.abs(gapForskudd))}
              </span>
            </div>
            {gapForskudd > 5000 && (
              <p className="text-[10px] mt-1" style={{ color: "#f87171" }}>
                Vurder å betale tilleggsforskudd innen 31. mai {aar + 1}
              </p>
            )}
          </div>
        )}

        {/* Terminer */}
        <div className="px-5 py-3">
          <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
            Anbefalt per termin: <span style={{ color: "#c9a84c", fontWeight: 500 }}>{kr(perTermin)}</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {terminer.map((t) => {
              const erPassert = t.dato < iDag;
              const erNeste   = !erPassert && terminer.filter(x => x.dato >= iDag)[0]?.nr === t.nr;
              return (
                <div
                  key={t.nr}
                  className="rounded-xl p-2.5 text-center"
                  style={{
                    background: erNeste
                      ? "rgba(201,168,76,0.10)"
                      : erPassert
                        ? "rgba(8,22,8,0.4)"
                        : "rgba(8,22,8,0.25)",
                    border: erNeste
                      ? "1px solid rgba(201,168,76,0.30)"
                      : "1px solid rgba(45,122,45,0.15)",
                  }}
                >
                  <div className="flex justify-center mb-1">
                    {erPassert ? (
                      <CheckCircle2 size={13} style={{ stroke: "rgba(74,222,128,0.5)" }} />
                    ) : erNeste ? (
                      <AlertTriangle size={13} style={{ stroke: "#c9a84c" }} />
                    ) : (
                      <Clock size={13} style={{ stroke: "rgba(120,180,120,0.3)" }} />
                    )}
                  </div>
                  <p className="text-[9px] font-semibold" style={{ color: erNeste ? "#c9a84c" : erPassert ? "rgba(120,180,120,0.4)" : "rgba(168,216,168,0.4)" }}>
                    Termin {t.nr}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: erNeste ? "rgba(201,168,76,0.7)" : "var(--text-dim)" }}>
                    {t.label}
                  </p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: erNeste ? "#c9a84c" : "var(--text-secondary)" }}>
                    {kr(perTermin)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Avsetning */}
      <section className="rounded-2xl overflow-hidden" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.20)" }}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xl font-bold" style={{ color: "#c9a84c" }}>{kr(totalSkatt)}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>
              Estimert total skatt — sett av dette beløpet
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Gjenstående etter skatt</p>
            <p className="text-base font-semibold" style={{ color: "rgba(168,216,168,0.8)" }}>
              {kr(Math.max(0, fakturainntekt + annenInntekt - utgifter - totalSkatt))}
            </p>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-center" style={{ color: "var(--text-dim)" }}>
        Estimat basert på 2026-satser. Konsulter regnskapsfører for nøyaktig skatteberegning.
      </p>
    </div>
  );
}

function Row({ label, verdi, bold }: { label: string; verdi: number; bold?: boolean }) {
  return (
    <div
      className="px-5 py-3 flex items-center justify-between"
      style={{ borderTop: "1px solid rgba(45,122,45,0.08)", background: bold ? "rgba(8,22,8,0.2)" : "transparent" }}
    >
      <span className="text-sm" style={{ color: bold ? "rgba(220,240,220,0.85)" : "var(--text-secondary)", fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span className="text-sm tabular-nums" style={{ color: bold ? "rgba(232,213,160,0.9)" : "rgba(200,230,200,0.8)", fontWeight: bold ? 600 : 400 }}>
        {verdi.toLocaleString("nb-NO")} kr
      </span>
    </div>
  );
}
