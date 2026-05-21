import Link from "next/link";
import { hentAlleFakturaer, markerForfalteFakturaer } from "@/lib/db/invoices";
import { hentAlleKunder } from "@/lib/db/customers";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { OpprettFakturaKnapp } from "./opprett-knapp";
import { FileText, ChevronRight } from "lucide-react";

const STATUS_ETIKETT: Record<string, { tekst: string; klasse: string; stripe: string }> = {
  draft:              { tekst: "Utkast",           klasse: "bg-slate-100 text-slate-500",   stripe: "bg-slate-300" },
  awaiting_approval:  { tekst: "Til godkjenning",  klasse: "bg-amber-100 text-amber-700",   stripe: "bg-amber-400" },
  sent:               { tekst: "Sendt",             klasse: "bg-blue-100 text-blue-700",     stripe: "bg-blue-400" },
  paid:               { tekst: "Betalt",            klasse: "bg-green-100 text-green-700",   stripe: "bg-green-500" },
  overdue:            { tekst: "Forfalt",           klasse: "bg-red-100 text-red-700",       stripe: "bg-red-500" },
  credited:           { tekst: "Kreditert",         klasse: "bg-purple-100 text-purple-700", stripe: "bg-purple-400" },
};

export default async function FakturaerSide() {
  await markerForfalteFakturaer();
  const [{ data: fakturaer }, { data: kunder }] = await Promise.all([
    hentAlleFakturaer(),
    hentAlleKunder(),
  ]);

  const aktiveKunder = (kunder ?? []).filter(
    (k) => !k.active_to || new Date(k.active_to) >= new Date()
  );

  const ventende = (fakturaer ?? []).filter(
    (f) => f.status === "awaiting_approval"
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fakturaer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {fakturaer?.length ?? 0} totalt
            {ventende.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {ventende.length} venter godkjenning
              </span>
            )}
          </p>
        </div>
        <OpprettFakturaKnapp kunder={aktiveKunder} />
      </div>

      {/* Venter godkjenning */}
      {ventende.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Krever handling
          </h2>
          <div className="space-y-2">
            {ventende.map((f) => {
              const kunde = f.customers;
              const status = STATUS_ETIKETT[f.status];
              return (
                <Link
                  key={f.id}
                  href={`/fakturaer/${f.id}`}
                  className="flex items-center justify-between rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        #{f.invoice_number} — {kunde?.short_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.klasse}`}>
                        {status.tekst}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatNorskDato(f.period_from)} – {formatNorskDato(f.period_to)} ·{" "}
                      <span className="font-medium text-slate-700">
                        {formatNorskValuta(Number(f.total))}
                      </span>
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Alle fakturaer */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Alle fakturaer
        </h2>
        <div className="space-y-2">
          {(fakturaer ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <FileText size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Ingen fakturaer ennå.</p>
            </div>
          )}
          {(fakturaer ?? []).map((f) => {
            const kunde = f.customers;
            const status = STATUS_ETIKETT[f.status] ?? { tekst: f.status, klasse: "bg-slate-100 text-slate-500", stripe: "bg-slate-300" };
            return (
              <Link
                key={f.id}
                href={`/fakturaer/${f.id}`}
                className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className={`w-1 self-stretch shrink-0 ${status.stripe}`} />
                <div className="flex items-center justify-between flex-1 px-4 py-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">
                        #{String(f.invoice_number).padStart(6, "0")} — {kunde?.short_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.klasse}`}>
                        {status.tekst}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatNorskDato(f.invoice_date)} · Forfall {formatNorskDato(f.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <p className="font-semibold text-slate-900 tabular-nums">
                      {formatNorskValuta(Number(f.total))}
                    </p>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
