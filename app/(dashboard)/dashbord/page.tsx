import Link from "next/link";
import { format, endOfWeek, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Clock, TrendingUp, AlertCircle, Plus } from "lucide-react";
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

  const ukeDager = new Map<string, PlanlagtSesjonMedKunde[]>();
  for (const s of ukensSesjoner ?? []) {
    const liste = ukeDager.get(s.scheduled_date) ?? [];
    liste.push(s);
    ukeDager.set(s.scheduled_date, liste);
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Toppkort */}
      <div className="glass-card">
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(45,122,45,.12)" }}>
          <p className="text-xs capitalize" style={{ color: "var(--text-dim)", letterSpacing: "0.5px" }}>
            {dagensTittel}
          </p>
          <h1
            className="text-2xl mt-0.5"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "0.5px" }}
          >
            Dashbord
          </h1>
        </div>

        {/* Nøkkeltall */}
        <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(45,122,45,.12)" }}>
          <StatKort
            ikon={<TrendingUp size={13} style={{ stroke: "#c9a84c", fill: "none" }} />}
            label={`Inntekt ${ar}`}
            verdi={formatNorskValuta(ytdInntekt)}
            sub="sendte + betalte"
          />
          <StatKort
            ikon={<AlertCircle size={13} style={{ stroke: forfaltAntall > 0 ? "#f87171" : "#c9a84c", fill: "none" }} />}
            label="Utestående"
            verdi={formatNorskValuta(ubetaltBelop)}
            sub={forfaltAntall > 0 ? `${forfaltAntall} forfalt` : "ubetalte fakturaer"}
            advarsel={forfaltAntall > 0}
          />
          <StatKort
            ikon={<Clock size={13} style={{ stroke: "#c9a84c", fill: "none" }} />}
            label="Timer ufakturert"
            verdi={`${timebankTotalt.toFixed(1)}t`}
            sub={formatNorskValuta(timebankBelop)}
          />
          <StatKort
            ikon={<CheckCircle2 size={13} style={{ stroke: "rgba(120,180,120,0.6)", fill: "none" }} />}
            label="Oppdrag i dag"
            verdi={String(planlagteIdag.length)}
            sub="planlagte"
          />
        </div>

        {/* Handlingsknapper */}
        <div className="flex gap-2.5 px-4 py-3">
          <Link
            href="/fakturaer/opprett"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.28)",
              color: "#c9a84c",
            }}
          >
            <Plus size={15} strokeWidth={2} />
            Ny faktura
          </Link>
          <Link
            href="/fakturaer"
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(8,22,8,0.5)",
              border: "1px solid rgba(45,122,45,0.18)",
              color: "var(--text-dim)",
            }}
          >
            Se alle
          </Link>
        </div>
      </div>

      {/* Budsjett */}
      <BudsjettWidget ytdInntekt={ytdInntekt} aar={ar} />

      {/* Ukeoversikt */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="section-label">Denne uken</span>
          <Link href="/timer" className="text-xs" style={{ color: "var(--text-dim)" }}>
            Se alle →
          </Link>
        </div>

        {ukeDager.size === 0 && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "rgba(8,22,8,0.4)",
              border: "1px dashed rgba(45,122,45,0.25)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen oppdrag denne uken.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {Array.from(ukeDager.entries()).map(([dato, sesjoner]) => (
            <div key={dato}>
              <p className="text-xs font-semibold uppercase tracking-wide capitalize mb-1.5 px-1" style={{ color: "var(--text-dim)" }}>
                {dagLabel(dato)}
              </p>
              <div className="glass-group flex flex-col">
                {sesjoner.map((sesjon) => {
                  const kunde = sesjon.customers as { id: string; short_name: string; hourly_rate: string } | null;
                  const erPlanlagt = sesjon.status === "planned";
                  const erFerdig = sesjon.status === "completed";
                  return (
                    <div
                      key={sesjon.id}
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: "1px solid rgba(20,50,20,.4)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{kunde?.short_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {sesjon.planned_duration_h}t ·{" "}
                          {formatNorskValuta(Number(sesjon.planned_duration_h) * Number(kunde?.hourly_rate ?? 0))}
                        </p>
                      </div>
                      {erPlanlagt && isToday(new Date(dato)) && (
                        <Link
                          href={`/timer/${sesjon.id}`}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                          style={{
                            background: "rgba(201,168,76,0.12)",
                            border: "1px solid rgba(201,168,76,0.25)",
                            color: "#c9a84c",
                          }}
                        >
                          Kvittér <ChevronRight size={11} />
                        </Link>
                      )}
                      {erPlanlagt && !isToday(new Date(dato)) && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(45,122,45,0.12)", color: "var(--text-dim)" }}
                        >
                          Planlagt
                        </span>
                      )}
                      {erFerdig && (
                        <CheckCircle2 size={17} style={{ stroke: "#4ade80", fill: "none" }} />
                      )}
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
  ikon, label, verdi, sub, advarsel,
}: {
  ikon: React.ReactNode;
  label: string;
  verdi: string;
  sub: string;
  advarsel?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 p-4" style={{ background: "rgba(8,22,8,0.35)" }}>
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{
          background: advarsel ? "rgba(239,68,68,0.10)" : "rgba(201,168,76,0.10)",
          border: advarsel ? "1px solid rgba(239,68,68,0.20)" : "1px solid rgba(201,168,76,0.18)",
        }}
      >
        {ikon}
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
        <p
          className="text-lg mt-0.5 leading-tight"
          style={{
            fontFamily: "var(--font-cinzel)",
            color: advarsel ? "#f87171" : "#c9a84c",
          }}
        >
          {verdi}
        </p>
        <p className="text-xs mt-0.5" style={{ color: advarsel ? "rgba(248,113,113,0.65)" : "var(--text-dim)" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}
