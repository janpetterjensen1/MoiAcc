import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hentPlanlagteSesjoner, hentHelligdager, hentFerieperioder } from "@/lib/db/calendar";
import { hentAlleKunder } from "@/lib/db/customers";
import { KalenderSidepanel } from "./sidepanel";
import { erGoogleKoblet, hentKommendHendelser } from "@/lib/google/calendar";
import { GoogleKalenderPanel } from "@/components/GoogleKalenderPanel";

// Fargekoding per kunde (stabil basert på indeks)
const KUNDE_FARGER = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
];

interface Props {
  searchParams: Promise<{ maned?: string }>;
}

export default async function KalenderSide({ searchParams }: Props) {
  const { maned } = await searchParams;

  const iDag = new Date();
  const valgtManed = maned ? parseISO(maned + "-01") : iDag;

  const manedStart = startOfMonth(valgtManed);
  const manedSlutt = endOfMonth(valgtManed);
  const fraStr = format(manedStart, "yyyy-MM-dd");
  const tilStr = format(manedSlutt, "yyyy-MM-dd");

  const [
    { data: sesjoner },
    { data: helligdager },
    { data: ferieperioder },
    { data: kunder },
    googleKoblet,
    googleHendelser,
  ] = await Promise.all([
    hentPlanlagteSesjoner(fraStr, tilStr),
    hentHelligdager(fraStr, tilStr),
    hentFerieperioder(fraStr, tilStr),
    hentAlleKunder(),
    erGoogleKoblet(),
    hentKommendHendelser(30).catch(() => []),
  ]);

  const helligdagSet = new Map(
    (helligdager ?? []).map((h) => [h.holiday_date, h.name])
  );

  const kundeKart = new Map(
    (kunder ?? []).map((k, i) => [
      k.id,
      { navn: k.short_name, farge: KUNDE_FARGER[i % KUNDE_FARGER.length] },
    ])
  );

  // Bygg kalendergrid — startdag mandag (ISO)
  const alleDager = eachDayOfInterval({ start: manedStart, end: manedSlutt });
  const forsteUkedag = getDay(manedStart); // 0=søn
  const tomCellerStart = forsteUkedag === 0 ? 6 : forsteUkedag - 1;

  const forrigeManed = format(subMonths(valgtManed, 1), "yyyy-MM");
  const nesteManed = format(addMonths(valgtManed, 1), "yyyy-MM");
  const maanedTittel = format(valgtManed, "MMMM yyyy", { locale: nb });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Kalender */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900 capitalize">
            {maanedTittel}
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/kalender?maned=${forrigeManed}`}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              href={`/kalender?maned=${format(iDag, "yyyy-MM")}`}
              className="px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 text-slate-600 transition-colors"
            >
              I dag
            </Link>
            <Link
              href={`/kalender?maned=${nesteManed}`}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        {/* Ukedager */}
        <div className="grid grid-cols-7 mb-1">
          {["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Dager */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
          {/* Tomme celler før første dag */}
          {Array.from({ length: tomCellerStart }).map((_, i) => (
            <div key={`tom-${i}`} className="bg-slate-50 min-h-[80px]" />
          ))}

          {alleDager.map((dag) => {
            const datoStr = format(dag, "yyyy-MM-dd");
            const erIdag = format(dag, "yyyy-MM-dd") === format(iDag, "yyyy-MM-dd");
            const erHelligdag = helligdagSet.has(datoStr);
            const helligdagNavn = helligdagSet.get(datoStr);
            const ukedag = getDay(dag); // 0=søn, 6=lør
            const erHelg = ukedag === 0 || ukedag === 6;

            const dagensFerie = (ferieperioder ?? []).find((f) =>
              isWithinInterval(dag, {
                start: parseISO(f.from_date),
                end: parseISO(f.to_date),
              })
            );

            const dagensSesj = (sesjoner ?? []).filter(
              (s) => s.scheduled_date === datoStr
            );

            return (
              <div
                key={datoStr}
                className={`bg-white min-h-[80px] p-1.5 ${
                  erHelg ? "bg-slate-50" : ""
                } ${erHelligdag ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      erIdag
                        ? "bg-slate-900 text-white"
                        : erHelg
                        ? "text-slate-400"
                        : "text-slate-700"
                    }`}
                  >
                    {format(dag, "d")}
                  </span>
                </div>

                {erHelligdag && (
                  <div className="text-[9px] text-red-500 leading-tight mb-0.5 truncate">
                    {helligdagNavn}
                  </div>
                )}

                {dagensFerie && !erHelligdag && (
                  <div className="text-[9px] text-blue-500 leading-tight mb-0.5 truncate">
                    {dagensFerie.description}
                  </div>
                )}

                <div className="space-y-0.5">
                  {dagensSesj
                    .filter((s) => s.status === "planned")
                    .map((s) => {
                      const info = kundeKart.get(s.customer_id);
                      return (
                        <div
                          key={s.id}
                          className={`${info?.farge ?? "bg-slate-400"} text-white text-[9px] px-1 py-0.5 rounded truncate`}
                          title={`${info?.navn} — ${s.planned_duration_h}t`}
                        >
                          {info?.navn} {s.planned_duration_h}t
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Forklaring */}
        <div className="flex flex-wrap gap-3 mt-3">
          {(kunder ?? []).map((k, i) => (
            <div key={k.id} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full ${KUNDE_FARGER[i % KUNDE_FARGER.length]}`}
              />
              <span className="text-xs text-slate-600">{k.short_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidepanel */}
      <div className="flex flex-col gap-4 lg:w-72 shrink-0">
        <GoogleKalenderPanel
          koblet={googleKoblet}
          hendelser={googleHendelser}
        />
        <KalenderSidepanel
          kunder={kunder ?? []}
          ferieperioder={ferieperioder ?? []}
          arValgt={valgtManed.getFullYear()}
        />
      </div>
    </div>
  );
}
