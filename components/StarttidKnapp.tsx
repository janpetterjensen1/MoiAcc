"use client";

import { useState, useTransition } from "react";
import { Clock, CheckCircle2, Loader2 } from "lucide-react";
import { settStartidAction } from "@/app/actions/geofence";

interface Props {
  sesjonId: string;
  gjeldendeTid?: string | null; // "HH:MM:SS" fra DB
  varighetH: number;
}

function tidTilKlokke(tid: string): string {
  return tid.slice(0, 5); // "09:00"
}

function beregnMidtpunkt(start: string, varighetH: number): string {
  const [h, m] = start.split(":").map(Number);
  const startMin = h * 60 + m;
  const midtMin = startMin + (varighetH * 60) / 2;
  const mh = Math.floor(midtMin / 60) % 24;
  const mm = Math.round(midtMin % 60);
  return `${String(mh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function StarttidKnapp({ sesjonId, gjeldendeTid, varighetH }: Props) {
  const [vis, setVis] = useState(false);
  const [tid, setTid] = useState(gjeldendeTid ? tidTilKlokke(gjeldendeTid) : "");
  const [lagret, setLagret] = useState(gjeldendeTid ? tidTilKlokke(gjeldendeTid) : "");
  const [feil, setFeil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lagre() {
    if (!tid) return;
    setFeil(null);
    startTransition(async () => {
      const res = await settStartidAction(sesjonId, tid);
      if (res.ok) {
        setLagret(tid);
        setVis(false);
      } else {
        setFeil(res.feil);
      }
    });
  }

  const midtpunkt = lagret ? beregnMidtpunkt(lagret, varighetH) : null;

  return (
    <div className="mt-3">
      {/* Vis satt tid */}
      {lagret && !vis && (
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-2"
          style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)" }}
        >
          <div className="flex items-center gap-2">
            <Clock size={13} style={{ color: "#c9a84c" }} />
            <span className="text-xs" style={{ color: "rgba(232,213,160,0.7)" }}>
              Start {lagret} · Sjekk kl. {midtpunkt}
            </span>
          </div>
          <button
            onClick={() => setVis(true)}
            className="text-xs opacity-50 hover:opacity-80 transition-opacity"
            style={{ color: "rgba(201,168,76,0.8)" }}
          >
            Endre
          </button>
        </div>
      )}

      {/* Knapp for å sette tid */}
      {!lagret && !vis && (
        <button
          onClick={() => setVis(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all"
          style={{
            background: "rgba(201,168,76,0.07)",
            border: "1px solid rgba(201,168,76,0.15)",
            color: "rgba(201,168,76,0.7)",
          }}
        >
          <Clock size={12} />
          Sett starttid for auto-kvittering
        </button>
      )}

      {/* Tidsinput */}
      {vis && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)" }}
        >
          <p className="text-xs font-medium" style={{ color: "rgba(201,168,76,0.8)" }}>
            Starttid for geofence-sjekk
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={tid}
              onChange={(e) => setTid(e.target.value)}
              className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
              style={{
                background: "rgba(4,10,4,0.6)",
                border: "1px solid rgba(201,168,76,0.25)",
                color: "rgba(232,213,160,0.9)",
              }}
              autoFocus
            />
            <button
              onClick={lagre}
              disabled={isPending || !tid}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
              style={{
                background: "rgba(201,168,76,0.15)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#c9a84c",
              }}
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Lagre
            </button>
            <button
              onClick={() => setVis(false)}
              className="text-xs opacity-40 hover:opacity-70 transition-opacity px-2"
              style={{ color: "rgba(168,216,168,0.7)" }}
            >
              ✕
            </button>
          </div>

          {tid && (
            <p className="text-xs" style={{ color: "rgba(168,216,168,0.4)" }}>
              Midtpunktsjekk kl. {beregnMidtpunkt(tid, varighetH)}
              {" "}(halvveis i {varighetH}t)
            </p>
          )}
          {feil && <p className="text-xs text-red-400">{feil}</p>}
        </div>
      )}
    </div>
  );
}
