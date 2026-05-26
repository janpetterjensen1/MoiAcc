import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Banknote } from "lucide-react";
import { hentPlanlagtSesjon, hentTimebankForKunde } from "@/lib/db/sessions";
import { kvitterFravar } from "@/app/actions/sessions";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { KvitteringsSkjema } from "@/components/KvitteringsSkjema";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}

export default async function KvitteringSide({ params, searchParams }: Props) {
  const { id } = await params;
  const { feil } = await searchParams;

  const { data: sesjon, error } = await hentPlanlagtSesjon(id);
  if (error || !sesjon) notFound();

  const kunde = sesjon.customers as { id: string; short_name: string; hourly_rate: string } | null;
  if (!kunde) notFound();

  const iDag = new Date();
  const { data: timebank } = await hentTimebankForKunde(
    kunde.id,
    iDag.getFullYear(),
    iDag.getMonth() + 1
  );

  const timebankTotalt = (timebank ?? [])
    .filter((r) => r.status === "pending_invoice" || r.status === "invoiced")
    .reduce((sum, r) => sum + Number(r.actual_duration_h), 0);

  const timebankBelop = (timebank ?? [])
    .filter((r) => r.status === "pending_invoice" || r.status === "invoiced")
    .reduce((sum, r) => sum + Number(r.line_amount), 0);

  const erBlokert = ["completed", "sick", "substitute", "vacation", "holiday", "cancelled"].includes(
    sesjon.status
  );

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/timer" className="text-slate-500 hover:text-slate-900">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{kunde.short_name}</h1>
          <p className="text-sm text-slate-500">
            {formatNorskDato(sesjon.scheduled_date)}
          </p>
        </div>
      </div>

      {feil && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {decodeURIComponent(feil)}
        </div>
      )}

      {erBlokert && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center mb-4">
          <p className="text-slate-500 text-sm">
            Denne sesjonen er allerede kvittert ({sesjon.status}).
          </p>
          <Link href="/timer" className="mt-2 inline-block text-sm font-medium underline">
            Tilbake
          </Link>
        </div>
      )}

      {!erBlokert && (
        <>
          {/* Timebank-kort */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Clock size={13} />
                <span className="text-xs">Timer denne mnd.</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {timebankTotalt.toFixed(1)}t
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Banknote size={13} />
                <span className="text-xs">Beløp denne mnd.</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {formatNorskValuta(timebankBelop)}
              </p>
            </div>
          </div>

          {/* Kvitteringsskjema med stoppeklokke */}
          <KvitteringsSkjema
            sesjonId={sesjon.id}
            customerId={kunde.id}
            sesjonDate={sesjon.scheduled_date}
            timesats={Number(kunde.hourly_rate)}
            defaultVarighet={Number(sesjon.planned_duration_h)}
          />

          {/* Fraværsknapper */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Registrer fravær
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(["sick", "substitute", "vacation"] as const).map((type) => {
                const label = { sick: "Syk", substitute: "Vikar", vacation: "Ferie" }[type];
                return (
                  <form key={type} action={kvitterFravar}>
                    <input type="hidden" name="sesjon_id" value={sesjon.id} />
                    <input type="hidden" name="customer_id" value={kunde.id} />
                    <input type="hidden" name="sesjon_date" value={sesjon.scheduled_date} />
                    <input type="hidden" name="timesats" value={kunde.hourly_rate} />
                    <input type="hidden" name="fravar_type" value={type} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {label}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
