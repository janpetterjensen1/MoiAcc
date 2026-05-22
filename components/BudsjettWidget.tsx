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

  const barFarge = prosent >= 100 ? "#4ade80" : prosent >= 60 ? "#c9a84c" : prosent >= 30 ? "rgba(201,168,76,0.5)" : "rgba(45,122,45,0.4)";

  if (maal === 0 && !redigerer) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: "rgba(8,22,8,0.45)",
          border: "1px dashed rgba(45,122,45,0.25)",
        }}
      >
        <div className="flex items-center gap-2">
          <Target size={15} style={{ stroke: "rgba(120,180,120,0.4)", fill: "none" }} />
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>Sett inntektsmål for {aar}</span>
        </div>
        <button
          onClick={() => setRedigerer(true)}
          className="text-xs"
          style={{ color: "rgba(201,168,76,0.6)", textDecoration: "underline" }}
        >
          Legg til
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(8,22,8,0.50)",
        border: "1px solid rgba(45,122,45,0.18)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.18)" }}
          >
            <Target size={13} style={{ stroke: "#c9a84c", fill: "none" }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Inntektsmål {aar}
          </span>
        </div>
        <button
          onClick={() => setRedigerer(!redigerer)}
          className="text-xs"
          style={{ color: "var(--text-dim)" }}
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
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background: "rgba(10,28,10,0.6)",
              border: "1px solid rgba(45,122,45,0.3)",
              color: "var(--text-primary)",
            }}
            onKeyDown={(e) => e.key === "Enter" && lagreMaal()}
            autoFocus
          />
          <button
            onClick={lagreMaal}
            className="rounded-xl px-4 py-2 text-sm font-medium"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.28)",
              color: "#c9a84c",
            }}
          >
            Lagre
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-dim)" }}>
              <span>{kr(ytdInntekt)}</span>
              <span style={{ color: "#c9a84c", fontWeight: 500 }}>{prosent}%</span>
              <span>{kr(maal)}</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(45,122,45,0.2)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${prosent}%`, background: barFarge }}
              />
            </div>
          </div>

          {mangler > 0 ? (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{kr(mangler)}</span> gjenstår ·{" "}
              ca. <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{kr(mndBehov)}/mnd</span> de neste {mndGjenstaende} månedene
            </p>
          ) : (
            <p className="text-xs font-medium" style={{ color: "#4ade80" }}>✓ Inntektsmål nådd!</p>
          )}
        </>
      )}
    </div>
  );
}
