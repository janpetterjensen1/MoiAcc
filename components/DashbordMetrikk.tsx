"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, AlertCircle, Clock, CheckCircle2, ChevronDown,
  ChevronRight, MessageSquare, ExternalLink,
} from "lucide-react";
import { formatNorskValuta, formatNorskDato } from "@/lib/utils";

export type InntektKunde = { kundeNavn: string; fakturert: number; antall: number };
export type UtestaaendeFaktura = {
  id: string;
  nummer: string;
  total: number;
  forfallsdato: string;
  status: "sent" | "overdue";
  kundeNavn: string;
  lokasjon: string | null;
  telefon: string | null;
};
export type TimerRad = {
  kundeNavn: string;
  timer: number;
  belop: number;
  datoer: string[];
};
export type DagensOppdrag = {
  id: string;
  kundeNavn: string;
  timer: number;
  starttid: string | null;
  status: string;
};

type Panel = "inntekt" | "utestaaende" | "timer" | "oppdrag" | null;

interface Props {
  ar: number;
  ytdInntekt: number;
  inntektPerKunde: InntektKunde[];
  ubetaltBelop: number;
  forfaltAntall: number;
  utestaaendeFakturaer: UtestaaendeFaktura[];
  timebankTotalt: number;
  timebankBelop: number;
  timerPerKunde: TimerRad[];
  planlagteIdag: number;
  dagensOppdrag: DagensOppdrag[];
}

export function DashbordMetrikk({
  ar,
  ytdInntekt,
  inntektPerKunde,
  ubetaltBelop,
  forfaltAntall,
  utestaaendeFakturaer,
  timebankTotalt,
  timebankBelop,
  timerPerKunde,
  planlagteIdag,
  dagensOppdrag,
}: Props) {
  const [apenPanel, setApenPanel] = useState<Panel>(null);

  function togglePanel(panel: Panel) {
    setApenPanel((prev) => (prev === panel ? null : panel));
  }

  const kortStyle = (panel: Panel, advarsel = false) => ({
    background: apenPanel === panel ? "rgba(20,50,20,0.6)" : "rgba(8,22,8,0.35)",
    cursor: "pointer",
    transition: "background 0.15s",
    borderBottom: apenPanel === panel
      ? `1px solid ${advarsel ? "rgba(239,68,68,0.3)" : "rgba(201,168,76,0.2)"}`
      : undefined,
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(45,122,45,.12)" }}>

        {/* Inntekt */}
        <button
          className="text-left flex flex-col gap-2 p-4 w-full"
          style={kortStyle("inntekt")}
          onClick={() => togglePanel("inntekt")}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.18)" }}
            >
              <TrendingUp size={13} style={{ stroke: "#c9a84c", fill: "none" }} />
            </div>
            <ChevronDown
              size={12}
              style={{
                stroke: "var(--text-dim)",
                transform: apenPanel === "inntekt" ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Inntekt {ar}</p>
            <p className="text-lg mt-0.5 leading-tight" style={{ fontFamily: "var(--font-cinzel)", color: "#c9a84c" }}>
              {formatNorskValuta(ytdInntekt)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>sendte + betalte</p>
          </div>
        </button>

        {/* Utestående */}
        <button
          className="text-left flex flex-col gap-2 p-4 w-full"
          style={kortStyle("utestaaende", forfaltAntall > 0)}
          onClick={() => togglePanel("utestaaende")}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: forfaltAntall > 0 ? "rgba(239,68,68,0.10)" : "rgba(201,168,76,0.10)",
                border: forfaltAntall > 0 ? "1px solid rgba(239,68,68,0.20)" : "1px solid rgba(201,168,76,0.18)",
              }}
            >
              <AlertCircle size={13} style={{ stroke: forfaltAntall > 0 ? "#f87171" : "#c9a84c", fill: "none" }} />
            </div>
            <ChevronDown
              size={12}
              style={{
                stroke: "var(--text-dim)",
                transform: apenPanel === "utestaaende" ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Utestående</p>
            <p
              className="text-lg mt-0.5 leading-tight"
              style={{ fontFamily: "var(--font-cinzel)", color: forfaltAntall > 0 ? "#f87171" : "#c9a84c" }}
            >
              {formatNorskValuta(ubetaltBelop)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: forfaltAntall > 0 ? "rgba(248,113,113,0.65)" : "var(--text-dim)" }}>
              {forfaltAntall > 0 ? `${forfaltAntall} forfalt` : "ubetalte fakturaer"}
            </p>
          </div>
        </button>

        {/* Timer ufakturert */}
        <button
          className="text-left flex flex-col gap-2 p-4 w-full"
          style={kortStyle("timer")}
          onClick={() => togglePanel("timer")}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.18)" }}
            >
              <Clock size={13} style={{ stroke: "#c9a84c", fill: "none" }} />
            </div>
            <ChevronDown
              size={12}
              style={{
                stroke: "var(--text-dim)",
                transform: apenPanel === "timer" ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Timer ufakturert</p>
            <p className="text-lg mt-0.5 leading-tight" style={{ fontFamily: "var(--font-cinzel)", color: "#c9a84c" }}>
              {timebankTotalt.toFixed(1)}t
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{formatNorskValuta(timebankBelop)}</p>
          </div>
        </button>

        {/* Oppdrag i dag */}
        <button
          className="text-left flex flex-col gap-2 p-4 w-full"
          style={kortStyle("oppdrag")}
          onClick={() => togglePanel("oppdrag")}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(45,122,45,0.12)", border: "1px solid rgba(45,122,45,0.20)" }}
            >
              <CheckCircle2 size={13} style={{ stroke: "rgba(120,180,120,0.6)", fill: "none" }} />
            </div>
            <ChevronDown
              size={12}
              style={{
                stroke: "var(--text-dim)",
                transform: apenPanel === "oppdrag" ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Oppdrag i dag</p>
            <p className="text-lg mt-0.5 leading-tight" style={{ fontFamily: "var(--font-cinzel)", color: "#c9a84c" }}>
              {planlagteIdag}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>planlagte</p>
          </div>
        </button>
      </div>

      {/* Ekspandert panel */}
      {apenPanel !== null && (
        <div style={{ borderTop: "1px solid rgba(45,122,45,0.12)" }}>

          {/* ── Inntekt per kunde ── */}
          {apenPanel === "inntekt" && (
            <div className="p-4 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>
                Inntekt {ar} per kunde
              </p>
              {inntektPerKunde.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen inntekt registrert.</p>
              )}
              {inntektPerKunde.map((k) => (
                <div
                  key={k.kundeNavn}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(8,22,8,0.5)", border: "1px solid rgba(45,122,45,0.15)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{k.kundeNavn}</p>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>{k.antall} faktura{k.antall !== 1 ? "er" : ""}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: "#c9a84c" }}>
                    {formatNorskValuta(k.fakturert)}
                  </p>
                </div>
              ))}
              <Link
                href="/fakturaer"
                className="mt-1 text-xs text-center py-2 rounded-xl"
                style={{ color: "var(--text-dim)", border: "1px solid rgba(45,122,45,0.15)" }}
              >
                Se alle fakturaer →
              </Link>
            </div>
          )}

          {/* ── Utestående fakturaer ── */}
          {apenPanel === "utestaaende" && (
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dim)" }}>
                Ubetalte fakturaer
              </p>
              {utestaaendeFakturaer.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen utestående fakturaer.</p>
              )}
              {utestaaendeFakturaer.map((f) => {
                const erForfalt = f.status === "overdue";
                const smsTekst = `Faktura ${f.nummer} for Spinning ${f.lokasjon ?? f.kundeNavn} forfalt ${formatNorskDato(f.forfallsdato)}. Vennligst sjekk og betal så snart som mulig. Mvh Jan Petter Jensen`;
                return (
                  <div
                    key={f.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(8,22,8,0.5)",
                      border: `1px solid ${erForfalt ? "rgba(239,68,68,0.25)" : "rgba(45,122,45,0.15)"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.kundeNavn}</p>
                          {erForfalt && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                            >
                              Forfalt
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          #{f.nummer} · {formatNorskValuta(f.total)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: erForfalt ? "rgba(248,113,113,0.65)" : "var(--text-dim)" }}>
                          Forfall: {formatNorskDato(f.forfallsdato)}
                        </p>
                      </div>
                      <Link
                        href={`/fakturaer/${f.id}`}
                        className="shrink-0"
                        style={{ color: "var(--text-dim)" }}
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>

                    {/* Purre-knapp via SMS */}
                    {f.telefon ? (
                      <a
                        href={`sms:${f.telefon}?body=${encodeURIComponent(smsTekst)}`}
                        className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: erForfalt ? "rgba(239,68,68,0.10)" : "rgba(201,168,76,0.10)",
                          border: `1px solid ${erForfalt ? "rgba(239,68,68,0.25)" : "rgba(201,168,76,0.22)"}`,
                          color: erForfalt ? "#f87171" : "#c9a84c",
                        }}
                      >
                        <MessageSquare size={13} />
                        Send purring via SMS
                      </a>
                    ) : (
                      <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
                        Legg til telefon på kunden for SMS-purring.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Timer ufakturert per kunde ── */}
          {apenPanel === "timer" && (
            <div className="p-4 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dim)" }}>
                Ufakturerte timer
              </p>
              {timerPerKunde.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen ufakturerte timer.</p>
              )}
              {timerPerKunde.map((k) => (
                <div
                  key={k.kundeNavn}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(8,22,8,0.5)", border: "1px solid rgba(45,122,45,0.15)" }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{k.kundeNavn}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                        {k.datoer.map((d) => formatNorskDato(d)).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums" style={{ color: "#c9a84c" }}>
                        {k.timer.toFixed(1)}t
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {formatNorskValuta(k.belop)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href="/timer"
                className="mt-1 text-xs text-center py-2 rounded-xl"
                style={{ color: "var(--text-dim)", border: "1px solid rgba(45,122,45,0.15)" }}
              >
                Se timebank →
              </Link>
            </div>
          )}

          {/* ── Oppdrag i dag ── */}
          {apenPanel === "oppdrag" && (
            <div className="p-4 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dim)" }}>
                Oppdrag i dag
              </p>
              {dagensOppdrag.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen planlagte oppdrag i dag.</p>
              )}
              {dagensOppdrag.map((o) => {
                const erPlanlagt = o.status === "planned";
                const erFerdig = o.status === "completed";
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(8,22,8,0.5)", border: "1px solid rgba(45,122,45,0.15)" }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{o.kundeNavn}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {o.starttid ? `${o.starttid} · ` : ""}{o.timer.toFixed(1)}t
                      </p>
                    </div>
                    {erPlanlagt && (
                      <Link
                        href={`/timer/${o.id}`}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                        style={{
                          background: "rgba(201,168,76,0.12)",
                          border: "1px solid rgba(201,168,76,0.25)",
                          color: "#c9a84c",
                        }}
                      >
                        Kvittér <ChevronRight size={11} />
                      </Link>
                    )}
                    {erFerdig && <CheckCircle2 size={17} style={{ stroke: "#4ade80", fill: "none" }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
