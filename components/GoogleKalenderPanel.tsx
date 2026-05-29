"use client";

import { useState, useTransition } from "react";
import { Calendar, ExternalLink, CheckCircle2, Loader2, CalendarPlus } from "lucide-react";
import { pushForskuddsskattTilKalender } from "@/app/actions/google-calendar";

interface Props {
  koblet: boolean;
  googleEmail?: string | null;
  hendelser?: {
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink: string;
  }[];
}

const kortDato = (iso: string) => {
  if (!iso) return "";
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
};

export function GoogleKalenderPanel({ koblet, googleEmail, hendelser = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "feil">("idle");
  const [melding, setMelding] = useState("");

  function handlePushSkatt() {
    startTransition(async () => {
      const res = await pushForskuddsskattTilKalender();
      if (res.ok > 0) {
        setStatus("ok");
        setMelding(`${res.ok} termin${res.ok > 1 ? "er" : ""} lagt til i Google Calendar`);
      } else {
        setStatus("feil");
        setMelding("Ingen terminer å legge til (allerede passert eller feil)");
      }
      setTimeout(() => setStatus("idle"), 4000);
    });
  }

  if (!koblet) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(8,22,8,0.4)",
          border: "1px solid rgba(45,122,45,0.2)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Calendar size={16} style={{ stroke: "rgba(168,216,168,0.5)" }} />
          <p className="text-sm font-medium" style={{ color: "rgba(232,213,160,0.8)" }}>
            Google Calendar
          </p>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Koble til Google Calendar for å synkronisere forfallsdatoer og forskuddsskatt-terminer.
        </p>
        <a
          href="/api/google/auth"
          className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium transition-all"
          style={{
            background: "rgba(201,168,76,0.10)",
            border: "1px solid rgba(201,168,76,0.30)",
            color: "#c9a84c",
          }}
        >
          <Calendar size={14} />
          Koble til Google Calendar
        </a>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,22,8,0.4)", border: "1px solid rgba(45,122,45,0.2)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(45,122,45,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} style={{ stroke: "#4ade80" }} />
          <p className="text-xs font-medium" style={{ color: "rgba(232,213,160,0.8)" }}>
            Google Calendar
          </p>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {googleEmail}
        </span>
      </div>

      {/* Feedback */}
      {status !== "idle" && (
        <div
          className="px-4 py-2 text-xs"
          style={{ color: status === "ok" ? "#4ade80" : "#f87171" }}
        >
          {melding}
        </div>
      )}

      {/* Kommende hendelser */}
      {hendelser.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(45,122,45,0.12)" }}>
          <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>
            Kommende hendelser
          </p>
          <div className="space-y-1.5">
            {hendelser.slice(0, 5).map((h) => (
              <a
                key={h.id}
                href={h.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors"
                style={{ background: "rgba(8,22,8,0.3)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] shrink-0" style={{ color: "#c9a84c" }}>
                    {kortDato(h.start)}
                  </span>
                  <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {h.summary}
                  </span>
                </div>
                <ExternalLink size={10} style={{ stroke: "var(--text-dim)", flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Handlinger */}
      <div className="px-4 py-3 space-y-2">
        <button
          onClick={handlePushSkatt}
          disabled={isPending}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs transition-all disabled:opacity-50"
          style={{
            background: "rgba(45,122,45,0.08)",
            border: "1px solid rgba(45,122,45,0.2)",
            color: "rgba(168,216,168,0.7)",
          }}
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
          Legg til forskuddsskatt-terminer i Google
        </button>

        <a
          href="/api/google/auth"
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs transition-all"
          style={{ color: "var(--text-dim)", border: "1px solid rgba(45,122,45,0.12)" }}
        >
          <Calendar size={12} />
          Koble til på nytt
        </a>
      </div>
    </div>
  );
}
