import Link from "next/link";
import { format, endOfWeek, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hentDagensSesjoner, hentSesjonloggForManed, hentSesjoner } from "@/lib/db/sessions";
import { formatNorskValuta } from "@/lib/utils";
import type { PlanlagtSesjonMedKunde } from "@/lib/db/sessions";

function dagLabel(dato: string): string {
  const d = new Date(dato);
  if (isToday(d)) return "I dag";
  if (isTomorrow(d)) return "I morgen";
  return format(d, "EEEE d. MMMM", { locale: nb });
}

export default async function DashbordSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const iDag = new Date();
  const ar = iDag.getFullYear();
  const maned = iDag.getMonth() + 1;
  const iDagStr = format(iDag, "yyyy-MM-dd");
  const ukeSlutt = format(endOfWeek(iDag, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [{ data: dagensSesjoner }, { data: maanedLogg }, { data: ukensSesjoner }] = await Promise.all([
    hentDagensSesjoner(),
    hentSesjonloggForManed(ar, maned),
    hentSesjoner(iDagStr, ukeSlutt),
  ]);

  const timebankTotalt = (maanedLogg ?? [])
    .filter((r) => r.status === "pending_invoice")
    .reduce((sum, r) => sum + Number(r.actual_duration_h), 0);

  const timebankBelop = (maanedLogg ?? [])
    .filter((r) => r.status === "pending_invoice")
    .reduce((sum, r) => sum + Number(r.line_amount), 0);

  const planlagteIdag = (dagensSesjoner ?? []).filter((s) => s.status === "planned");
  const dagensTittel = format(iDag, "EEEE d. MMMM", { locale: nb });

  // Grupper ukens sesjoner per dato
  const ukeDager = new Map<string, PlanlagtSesjonMedKunde[]>();
  for (const s of ukensSesjoner ?? []) {
    const liste = ukeDager.get(s.scheduled_date) ?? [];
    liste.push(s);
    ukeDager.set(s.scheduled_date, liste);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-0.5">Dashbord</h1>
      <p className="text-sm text-slate-500 mb-6 capitalize">{dagensTittel}</p>

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Clock size={11} /> Timer ufakturert
          </p>
          <p className="text-2xl font-bold text-slate-900">{timebankTotalt.toFixed(1)}t</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatNorskValuta(timebankBelop)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Oppdrag i dag</p>
          <p className="text-2xl font-bold text-slate-900">{planlagteIdag.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">ikke kvittert</p>
        </div>
      </div>

      {/* Ukeoversikt */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Denne uken</h2>
          <Link href="/timer" className="text-xs text-slate-400 hover:text-slate-700">Se alle →</Link>
        </div>

        {ukeDager.size === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-slate-400 text-sm">Ingen oppdrag denne uken.</p>
          </div>
        )}

        <div className="space-y-4">
          {Array.from(ukeDager.entries()).map(([dato, sesjoner]) => (
            <div key={dato}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize mb-2">
                {dagLabel(dato)}
              </p>
              <div className="space-y-2">
                {sesjoner.map((sesjon) => {
                  const kunde = sesjon.customers as { id: string; short_name: string; hourly_rate: string } | null;
                  const erPlanlagt = sesjon.status === "planned";
                  const erFerdig = sesjon.status === "completed";
                  return (
                    <div
                      key={sesjon.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{kunde?.short_name}</p>
                        <p className="text-xs text-slate-400">
                          {sesjon.planned_duration_h}t ·{" "}
                          {formatNorskValuta(Number(sesjon.planned_duration_h) * Number(kunde?.hourly_rate ?? 0))}
                        </p>
                      </div>
                      {erPlanlagt && isToday(new Date(dato)) && (
                        <Link
                          href={`/timer/${sesjon.id}`}
                          className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
                        >
                          Kvittér <ChevronRight size={12} />
                        </Link>
                      )}
                      {erPlanlagt && !isToday(new Date(dato)) && (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Planlagt</span>
                      )}
                      {erFerdig && <CheckCircle2 size={18} className="text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
