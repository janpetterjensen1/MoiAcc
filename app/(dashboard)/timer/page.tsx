import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  isToday,
  isTomorrow,
} from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, XCircle, HelpCircle, Clock, ChevronRight } from "lucide-react";
import { hentDagensSesjoner, hentSesjonloggForManed, hentSesjoner } from "@/lib/db/sessions";
import { hentAlleKunder } from "@/lib/db/customers";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { EventModal } from "@/components/EventModal";
import type { PlanlagtSesjonMedKunde } from "@/lib/db/sessions";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planlagt",
  completed: "Gjennomført",
  sick: "Syk",
  substitute: "Vikar",
  vacation: "Ferie",
  holiday: "Helligdag",
  cancelled: "Kansellert",
};

function dagLabel(dato: string): string {
  const d = new Date(dato);
  if (isToday(d)) return "I dag";
  if (isTomorrow(d)) return "I morgen";
  return format(d, "EEEE d. MMMM", { locale: nb });
}

interface Props {
  searchParams: Promise<{ kvittert?: string }>;
}

export default async function TimerSide({ searchParams }: Props) {
  const { kvittert } = await searchParams;
  const iDag = new Date();
  const ar = iDag.getFullYear();
  const maned = iDag.getMonth() + 1;

  const iDagStr = format(iDag, "yyyy-MM-dd");
  const iMorgenStr = format(addDays(iDag, 1), "yyyy-MM-dd");
  const iGaarStr = format(subDays(iDag, 1), "yyyy-MM-dd");
  const maanedStart = format(startOfMonth(iDag), "yyyy-MM-dd");
  const maanedSlutt = format(endOfMonth(iDag), "yyyy-MM-dd");

  const [
    { data: dagensSesjoner },
    { data: maanedLogg },
    { data: kommendeSesjoner },
    { data: tidligereSesjoner },
    { data: kunder },
  ] = await Promise.all([
    hentDagensSesjoner(),
    hentSesjonloggForManed(ar, maned),
    hentSesjoner(iMorgenStr, maanedSlutt),
    hentSesjoner(maanedStart, iGaarStr),
    hentAlleKunder(),
  ]);

  const dagensTittel = format(iDag, "EEEE d. MMMM", { locale: nb });

  // Grupper kommende sesjoner per dato
  const kommendeDager = new Map<string, PlanlagtSesjonMedKunde[]>();
  for (const s of kommendeSesjoner ?? []) {
    const liste = kommendeDager.get(s.scheduled_date) ?? [];
    liste.push(s);
    kommendeDager.set(s.scheduled_date, liste);
  }

  // Uloggede sesjoner: passerte dager med status "planned" (ikke kvittert)
  const uloggedeSesjoner = (tidligereSesjoner ?? []).filter((s) => s.status === "planned");

  // Kombinert timebank: session_log + uloggede planlagte sesjoner
  type LoggRad =
    | {
        type: "logg";
        dato: string;
        kundeNavn: string;
        timer: number;
        belop: number;
        status: string;
      }
    | { type: "ulogget"; dato: string; kundeNavn: string; planTimer: number };

  const timebankRader: LoggRad[] = [
    ...(maanedLogg ?? []).map((r) => ({
      type: "logg" as const,
      dato: r.session_date,
      kundeNavn: (r.customers as { short_name: string } | null)?.short_name ?? "Ukjent",
      timer: Number(r.actual_duration_h),
      belop: Number(r.line_amount),
      status: r.status,
    })),
    ...uloggedeSesjoner.map((s) => ({
      type: "ulogget" as const,
      dato: s.scheduled_date,
      kundeNavn: (s.customers as { short_name: string } | null)?.short_name ?? "Ukjent",
      planTimer: Number(s.planned_duration_h),
    })),
  ].sort((a, b) => b.dato.localeCompare(a.dato));

  const fakturerbareTotalt = (maanedLogg ?? [])
    .filter((s) => s.status === "pending_invoice" || s.status === "invoiced")
    .reduce((sum, s) => sum + Number(s.actual_duration_h), 0);

  return (
    <div className="max-w-lg">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Timer</h1>
        <EventModal kunder={(kunder ?? []).map((k) => ({ id: k.id, short_name: k.short_name }))} />
      </div>
      <p className="text-sm text-slate-500 mb-6 capitalize">{dagensTittel}</p>

      {kvittert && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">
          <CheckCircle2 size={16} />
          Time kvittert og lagt i timebanken.
        </div>
      )}

      {/* I dag */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">I dag</h2>

        {(!dagensSesjoner || dagensSesjoner.length === 0) && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-400 text-sm">Ingen planlagte oppdrag i dag.</p>
          </div>
        )}

        <div className="space-y-2">
          {(dagensSesjoner ?? []).map((sesjon) => {
            const kunde = sesjon.customers as { id: string; short_name: string; hourly_rate: string } | null;
            const erPlanlagt = sesjon.status === "planned";
            const erBlokert = ["holiday", "vacation", "cancelled"].includes(sesjon.status);
            return (
              <div
                key={sesjon.id}
                className={`rounded-xl border bg-white px-5 py-4 ${erBlokert ? "border-slate-200 opacity-60" : "border-slate-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{kunde?.short_name ?? "Ukjent kunde"}</p>
                    <p className="text-sm text-slate-500">
                      {sesjon.planned_duration_h}t · {STATUS_LABEL[sesjon.status] ?? sesjon.status}
                      {sesjon.blocked_reason && ` — ${sesjon.blocked_reason}`}
                    </p>
                  </div>
                  {erPlanlagt && (
                    <Link
                      href={`/timer/${sesjon.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors shrink-0"
                    >
                      Kvittér <ChevronRight size={14} />
                    </Link>
                  )}
                  {sesjon.status === "completed" && <CheckCircle2 size={20} className="text-green-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Resten av måneden */}
      {kommendeDager.size > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Resten av {format(iDag, "MMMM", { locale: nb })}
          </h2>
          <div className="space-y-4">
            {Array.from(kommendeDager.entries()).map(([dato, sesjoner]) => (
              <div key={dato}>
                <p className="text-xs font-medium text-slate-400 capitalize mb-1.5">{dagLabel(dato)}</p>
                <div className="space-y-2">
                  {sesjoner.map((sesjon) => {
                    const kunde = sesjon.customers as { id: string; short_name: string; hourly_rate: string } | null;
                    return (
                      <div
                        key={sesjon.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{kunde?.short_name}</p>
                          <p className="text-xs text-slate-400">
                            {sesjon.planned_duration_h}t
                            {kunde?.hourly_rate && (
                              <> · {formatNorskValuta(Number(sesjon.planned_duration_h) * Number(kunde.hourly_rate))}</>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Planlagt</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timebank denne måneden */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {format(iDag, "MMMM", { locale: nb })} — timebank
          </h2>
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Clock size={14} />
            {fakturerbareTotalt.toFixed(1)}t
          </div>
        </div>

        <div className="space-y-1.5">
          {timebankRader.map((rad, i) => {
            if (rad.type === "ulogget") {
              return (
                <div
                  key={`ulogget-${rad.dato}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 tabular-nums w-20">{formatNorskDato(rad.dato)}</span>
                    <span className="text-slate-600">{rad.kundeNavn}</span>
                    <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                      {rad.planTimer.toFixed(1)}t plan
                    </span>
                  </div>
                  <HelpCircle size={18} className="text-amber-400 shrink-0" />
                </div>
              );
            }

            const erFravar = ["sick", "substitute", "vacation"].includes(rad.status);
            const erFakturerbar = rad.status === "pending_invoice" || rad.status === "invoiced";

            return (
              <div
                key={`logg-${rad.dato}-${i}`}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                  erFravar
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 tabular-nums w-20">{formatNorskDato(rad.dato)}</span>
                  <span className={erFravar ? "text-slate-400" : "text-slate-700"}>{rad.kundeNavn}</span>
                  {erFravar && (
                    <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                      {STATUS_LABEL[rad.status]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {erFakturerbar && (
                    <span className="text-slate-400 tabular-nums text-xs">
                      {rad.timer.toFixed(1)}t · {formatNorskValuta(rad.belop)}
                    </span>
                  )}
                  {erFakturerbar && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                  {erFravar && <XCircle size={18} className="text-red-400 shrink-0" />}
                </div>
              </div>
            );
          })}

          {timebankRader.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Ingen timer registrert denne måneden.</p>
          )}
        </div>
      </section>
    </div>
  );
}
