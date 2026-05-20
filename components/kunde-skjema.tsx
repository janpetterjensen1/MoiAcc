"use client";

import { useState } from "react";
import { slaOppBrregAction } from "@/app/actions/customers";
import { Search, ExternalLink } from "lucide-react";

interface Prefill {
  short_name?: string;
  legal_name?: string;
  org_number?: string;
  invoice_email?: string;
  invoice_day_rule?: string;
  payment_days?: number;
  hourly_rate?: number;
  active_from?: string;
  active_to?: string;
  notes?: string;
  invoice_address_street?: string;
  invoice_address_postal_code?: string;
  invoice_address_city?: string;
}

interface Props {
  action: (formData: FormData) => void;
  prefill?: Prefill;
  feil?: string;
  lagret?: boolean;
}

export function KundeSkjema({ action, prefill, feil, lagret }: Props) {
  const [orgnr, setOrgnr] = useState(prefill?.org_number ?? "");
  const [legalName, setLegalName] = useState(prefill?.legal_name ?? "");
  const [gate, setGate] = useState(prefill?.invoice_address_street ?? "");
  const [postnr, setPostnr] = useState(prefill?.invoice_address_postal_code ?? "");
  const [poststed, setPoststed] = useState(prefill?.invoice_address_city ?? "");
  const [laster, setLaster] = useState(false);
  const [brregFeil, setBrregFeil] = useState<string | null>(null);

  async function slaOpp() {
    const rent = orgnr.replace(/\s/g, "");
    if (!/^\d{9}$/.test(rent)) {
      setBrregFeil("Org.nr må være 9 siffer");
      return;
    }
    setLaster(true);
    setBrregFeil(null);
    const res = await slaOppBrregAction(rent);
    setLaster(false);
    if (!res) {
      setBrregFeil("Fant ikke org.nr i Brønnøysundregistrene");
      return;
    }
    setLegalName(res.navn);
    if (res.adresse) {
      setGate(res.adresse.gate);
      setPostnr(res.adresse.postnummer);
      setPoststed(res.adresse.poststed);
    }
  }

  return (
    <form action={action} className="space-y-6">
      {feil && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(feil)}
        </div>
      )}
      {lagret && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Endringer lagret.
        </div>
      )}

      {/* Kallenavn */}
      <Felt label="Kallenavn (internt)" name="short_name" required defaultValue={prefill?.short_name} placeholder="f.eks. Equinor ML33" />

      {/* Org.nr + Brønnøysund */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Org.nummer <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            name="org_number"
            type="text"
            inputMode="numeric"
            required
            value={orgnr}
            onChange={(e) => setOrgnr(e.target.value)}
            placeholder="123456789"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="button"
            onClick={slaOpp}
            disabled={laster}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Search size={14} />
            {laster ? "Søker…" : "Brreg"}
          </button>
        </div>
        {brregFeil && <p className="text-xs text-red-600 mt-1">{brregFeil}</p>}
        {orgnr.replace(/\s/g, "").length === 9 && (
          <a
            href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${orgnr.replace(/\s/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ExternalLink size={11} />
            Se i Brønnøysundregistrene
          </a>
        )}
      </div>

      {/* Juridisk navn */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Juridisk navn <span className="text-red-500">*</span>
        </label>
        <input
          name="legal_name"
          type="text"
          required
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="Fylt ut fra Brreg"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Fakturaadresse */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Fakturaadresse</p>
        <input
          name="invoice_address_street"
          type="text"
          required
          value={gate}
          onChange={(e) => setGate(e.target.value)}
          placeholder="Gate og nummer"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <div className="flex gap-3">
          <input
            name="invoice_address_postal_code"
            type="text"
            inputMode="numeric"
            required
            value={postnr}
            onChange={(e) => setPostnr(e.target.value)}
            placeholder="Postnr"
            maxLength={4}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <input
            name="invoice_address_city"
            type="text"
            required
            value={poststed}
            onChange={(e) => setPoststed(e.target.value)}
            placeholder="Poststed"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <Felt label="Faktura-e-post" name="invoice_email" type="email" required defaultValue={prefill?.invoice_email} placeholder="faktura@kunde.no" />

      {/* Faktureringsregel */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Faktureringsdag <span className="text-red-500">*</span>
        </label>
        <select
          name="invoice_day_rule"
          required
          defaultValue={prefill?.invoice_day_rule ?? "last_friday"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="day_20">20. i måneden</option>
          <option value="last_thursday">Siste torsdag i måneden</option>
          <option value="last_weekday">Siste dag i måneden</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Felt label="Betalingsfrist (dager)" name="payment_days" type="number" required defaultValue={prefill?.payment_days ?? 14} min={1} max={60} />
        <Felt label="Timesats (kr)" name="hourly_rate" type="number" required defaultValue={prefill?.hourly_rate} step="0.01" placeholder="773.00" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Felt label="Aktiv fra" name="active_from" type="date" required defaultValue={prefill?.active_from} />
        <Felt label="Aktiv til (valgfritt)" name="active_to" type="date" defaultValue={prefill?.active_to} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notater</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={prefill?.notes}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
      >
        Lagre
      </button>
    </form>
  );
}

function Felt({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    </div>
  );
}
