"use client";

import { useRouter } from "next/navigation";

const KONTO_NAVN: Record<string, string> = {
  "6000": "Varekjøp",
  "6540": "Inventar og utstyr",
  "6900": "Telefon og internett",
  "7140": "Reise og transport",
  "7150": "Diett og overnatting",
  "7160": "Reklame og markedsføring",
  "7320": "Revisjon og regnskap",
  "7500": "Forsikring",
  "7770": "Bank og kortgebyr",
  "7790": "Andre driftskostnader",
};

function kr(v: number) {
  return v.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";
}

interface KontoSum { account_code: string; sum: number }

interface Props {
  aar: number;
  alleAar: number[];
  fakturainntekt: number;
  utgifterPerKonto: KontoSum[];
}

export function Aarsregnskap({ aar, alleAar, fakturainntekt, utgifterPerKonto }: Props) {
  const router = useRouter();
  const sumUtgifter = utgifterPerKonto.reduce((s, k) => s + k.sum, 0);
  const driftsresultat = fakturainntekt - sumUtgifter;

  return (
    <>
      {/* Kontroller — skjult ved utskrift */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">År:</label>
          <select
            value={aar}
            onChange={(e) => router.push(`/regnskap?aar=${e.target.value}`)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {alleAar.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50 transition-colors"
        >
          Skriv ut / Lagre PDF
        </button>
      </div>

      {/* Rapport */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-0 print:rounded-none">

        {/* Tittel */}
        <div className="px-6 py-5 border-b border-slate-200 print:border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Næringsoppgave {aar}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Grunnlag for RF-1175 · {process.env.NEXT_PUBLIC_SELLER_NAME ?? "Jan Petter Jensen"}
          </p>
        </div>

        {/* Driftsinntekter */}
        <Seksjon tittel="Driftsinntekter">
          <Rad kode="3100" navn="Salgsinntekter, avgiftsfritt (§ 3-8)" belop={fakturainntekt} />
          <SumRad label="Sum driftsinntekter" belop={fakturainntekt} />
        </Seksjon>

        {/* Driftskostnader */}
        <Seksjon tittel="Driftskostnader">
          {utgifterPerKonto.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-400 italic">Ingen registrerte utgifter for {aar}</p>
          ) : (
            utgifterPerKonto.map((k) => (
              <Rad
                key={k.account_code}
                kode={k.account_code}
                navn={KONTO_NAVN[k.account_code] ?? "Annen kostnad"}
                belop={k.sum}
              />
            ))
          )}
          <SumRad label="Sum driftskostnader" belop={sumUtgifter} />
        </Seksjon>

        {/* Driftsresultat */}
        <div className="px-6 py-4 border-t-2 border-slate-900 flex justify-between items-center print:border-slate-900">
          <div>
            <span className="text-base font-bold text-slate-900">Driftsresultat</span>
            <span className="ml-3 text-sm text-slate-500">(overføres til skattemelding)</span>
          </div>
          <span className={`text-base font-bold ${driftsresultat >= 0 ? "text-slate-900" : "text-red-600"}`}>
            {kr(driftsresultat)}
          </span>
        </div>

        {/* Altinn-veiledning */}
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 print:hidden">
          <p className="text-xs text-blue-800 font-semibold mb-1">Slik bruker du disse tallene i Altinn</p>
          <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
            <li>Logg inn på altinn.no → Skattemelding for næringsdrivende</li>
            <li>Velg «Næringsoppgave 1 (RF-1175)»</li>
            <li>Fyll inn tallene over i tilhørende poster</li>
            <li>Driftsresultatet overføres automatisk til skattemeldingen</li>
          </ol>
        </div>
      </div>
    </>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-200">
      <div className="px-6 py-2 bg-slate-50">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tittel}</span>
      </div>
      {children}
    </div>
  );
}

function Rad({ kode, navn, belop }: { kode: string; navn: string; belop: number }) {
  return (
    <div className="px-6 py-2.5 flex justify-between items-baseline border-b border-slate-50">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-mono text-slate-400 w-10 shrink-0">{kode}</span>
        <span className="text-sm text-slate-700">{navn}</span>
      </div>
      <span className="text-sm text-slate-900 tabular-nums">{kr(belop)}</span>
    </div>
  );
}

function SumRad({ label, belop }: { label: string; belop: number }) {
  return (
    <div className="px-6 py-2.5 flex justify-between items-baseline bg-slate-50 border-t border-slate-200">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{kr(belop)}</span>
    </div>
  );
}
