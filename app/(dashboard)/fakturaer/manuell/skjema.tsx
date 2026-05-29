"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { registrerManuellFakturaAction } from "@/app/actions/invoices";

interface Props {
  kunder: { id: string; navn: string }[];
  iDag: string;
}

const inputKlasse = "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]";
const inputStyle = {
  background: "rgba(8,22,8,0.6)",
  border: "1px solid rgba(45,122,45,0.3)",
  color: "rgba(220,240,220,0.9)",
};

const labelStyle = { color: "rgba(168,216,168,0.6)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.3px" };

export function ManuellFakturaSkjema({ kunder, iDag }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feil, setFeil] = useState<string | null>(null);
  const [brukEksisterendeKunde, setBrukEksisterendeKunde] = useState(kunder.length > 0);
  const [status, setStatus] = useState("sent");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await registrerManuellFakturaAction(formData);
      if (res.success) {
        router.push(res.id ? `/fakturaer/${res.id}` : "/fakturaer");
      } else {
        setFeil(res.error ?? "Noe gikk galt");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 space-y-5">

      {feil && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
          {feil}
        </div>
      )}

      {/* Fakturanummer */}
      <div>
        <label className="block mb-1.5" style={labelStyle}>
          FAKTURANUMMER
          <span className="ml-1 opacity-50">(la stå tomt for å auto-generere)</span>
        </label>
        <input
          name="invoice_number"
          type="text"
          placeholder="2025-001"
          className={inputKlasse}
          style={inputStyle}
          pattern="^\d{4}-\d+$|^$"
          title="Format: YYYY-NNN, f.eks. 2025-001"
        />
        <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>
          Format: 2025-001 — årstallet synkroniseres automatisk med neste nummer
        </p>
      </div>

      {/* Kunde */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label style={labelStyle}>KUNDE</label>
          {kunder.length > 0 && (
            <button
              type="button"
              onClick={() => setBrukEksisterendeKunde(!brukEksisterendeKunde)}
              className="text-[10px] transition-colors"
              style={{ color: "#c9a84c" }}
            >
              {brukEksisterendeKunde ? "Skriv inn manuelt" : "Velg fra liste"}
            </button>
          )}
        </div>

        {brukEksisterendeKunde && kunder.length > 0 ? (
          <select name="customer_id" className={inputKlasse} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">— Velg kunde —</option>
            {kunder.map(k => (
              <option key={k.id} value={k.id}>{k.navn}</option>
            ))}
          </select>
        ) : (
          <input
            name="external_customer_name"
            type="text"
            placeholder="Kundenavn AS"
            required
            className={inputKlasse}
            style={inputStyle}
          />
        )}
      </div>

      {/* Datoer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1.5" style={labelStyle}>FAKTURADATO *</label>
          <input
            name="invoice_date"
            type="date"
            defaultValue={iDag}
            required
            className={inputKlasse}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block mb-1.5" style={labelStyle}>FORFALLSDATO</label>
          <input
            name="due_date"
            type="date"
            defaultValue={iDag}
            className={inputKlasse}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Periode */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1.5" style={labelStyle}>PERIODE FRA</label>
          <input name="period_from" type="date" className={inputKlasse} style={inputStyle} />
        </div>
        <div>
          <label className="block mb-1.5" style={labelStyle}>PERIODE TIL</label>
          <input name="period_to" type="date" className={inputKlasse} style={inputStyle} />
        </div>
      </div>

      {/* Beløp */}
      <div>
        <label className="block mb-1.5" style={labelStyle}>TOTALBELØP (kr) *</label>
        <input
          name="subtotal"
          type="text"
          inputMode="decimal"
          placeholder="12 500"
          required
          className={inputKlasse}
          style={inputStyle}
        />
      </div>

      {/* Status */}
      <div>
        <label className="block mb-1.5" style={labelStyle}>STATUS *</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: "sent", tekst: "Sendt (ikke betalt)" },
            { val: "paid", tekst: "Betalt" },
          ].map(({ val, tekst }) => (
            <label
              key={val}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
              style={{
                background: status === val ? "rgba(201,168,76,0.08)" : "rgba(8,22,8,0.4)",
                border: `1px solid ${status === val ? "rgba(201,168,76,0.35)" : "rgba(45,122,45,0.2)"}`,
              }}
            >
              <input
                type="radio"
                name="status"
                value={val}
                checked={status === val}
                onChange={() => setStatus(val)}
                className="sr-only"
              />
              <div
                className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: status === val ? "#c9a84c" : "rgba(45,122,45,0.4)" }}
              >
                {status === val && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a84c" }} />}
              </div>
              <span className="text-xs" style={{ color: status === val ? "#c9a84c" : "var(--text-secondary)" }}>
                {tekst}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Betalt dato */}
      {status === "paid" && (
        <div>
          <label className="block mb-1.5" style={labelStyle}>BETALT DATO</label>
          <input
            name="paid_at"
            type="date"
            defaultValue={iDag}
            className={inputKlasse}
            style={inputStyle}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-50"
        style={{
          background: "rgba(201,168,76,0.12)",
          border: "1px solid rgba(201,168,76,0.3)",
          color: "#c9a84c",
        }}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {isPending ? "Registrerer…" : "Registrer faktura"}
      </button>
    </form>
  );
}
