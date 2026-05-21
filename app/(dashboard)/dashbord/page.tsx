import Link from "next/link";
import { format, endOfWeek, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hentDagensSesjoner, hentSesjonloggForManed, hentSesjoner } from "@/lib/db/sessions";
import { hentFakturainntektForAar } from "@/lib/db/skatt";
import { BudsjettWidget } from "@/components/BudsjettWidget";
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

  const [{ data: dagensSesjoner }, { data: maanedLogg }, { data: ukensSesjoner }, ytdInntekt, { data: alleFakturaer }] = await Promise.all([
    hentDagensSesjoner(),
    hentSesjonloggForManed(ar, maned),
    hentSesjoner(iDagStr, ukeSlutt),
    hentFakturainntektForAar(ar),
    supabase.from("invoices").select("status, total, due_date").in("status", ["sent", "overdue"]),
  ]);

  const ubetaltBelop = (alleFakturaer ?? []).reduce((sum, f) => sum + Number(f.total), 0);
  const forfaltAntall = (alleFakturaer ?? []).filter((f) => f.status === "overdue").length;

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
        <StatKort
          ikon={<TrendingUp size={14} className="text-emerald-600" />}
          ikonBg="bg-emerald-50"
          label={`Inntekt ${ar}`}
          verdi={formatNorskValuta(ytdInntekt)}
          sub="sendte + betalte fakturaer"
        />
        <StatKort
          ikon={<AlertCircle size={14} className={forfaltAntall > 0 ? "text-red-600" : "text-blue-600"} />}
          ikonBg={forfaltAntall > 0 ? "bg-red-50" : "bg-blue-50"}
          label="Utestående"
          verdi={formatNorskValuta(ubetaltBelop)}
          sub={forfaltAntall > 0 ? `${forfaltAntall} forfalt` : "ubetalte fakturaer"}
          advarsel={forfaltAntall > 0}
        />
        <StatKort
          ikon={<Clock size={14} className="text-amber-600" />}
          ikonBg="bg-amber-50"
          label="Timer ufakturert"
          verdi={`${timebankTotalt.toFixed(1)}t`}
          sub={formatNorskValuta(timebankBelop)}
        />
        <StatKort
          ikon={<CheckCircle2 size={14} className="text-slate-500" />}
          ikonBg="bg-slate-100"
          label="Oppdrag i dag"
          verdi={String(planlagteIdag.length)}
          sub="ikke kvittert"
        />
      </div>

      {/* Budsjett */}
      <div className="mb-6">
        <BudsjettWidget ytdInntekt={ytdInntekt} aar={ar} />
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

function StatKort({
  ikon, ikonBg, label, verdi, sub, advarsel,
}: {
  ikon: React.ReactNode;
  ikonBg: string;
  label: string;
  verdi: string;
  sub: string;
  advarsel?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm flex flex-col gap-2 ${advarsel ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ikonBg}`}>
        {ikon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-xl font-bold mt-0.5 leading-tight ${advarsel ? "text-red-700" : "text-slate-900"}`}>{verdi}</p>
        <p className={`text-xs mt-0.5 ${advarsel ? "text-red-500" : "text-slate-400"}`}>{sub}</p>
      </div>
    </div>
  );
}
