import Link from "next/link";
import { format, endOfWeek, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hentDagensSesjoner } from "@/lib/db/sessions";
import { hentFakturainntektForAar } from "@/lib/db/skatt";
import { formatNorskValuta } from "@/lib/utils";
import { DashbordMetrikk } from "@/components/DashbordMetrikk";
import type { PlanlagtSesjonMedKunde } from "@/lib/db/sessions";
import type { InntektKunde, UtestaaendeFaktura, TimerRad, DagensOppdrag } from "@/components/DashbordMetrikk";

function dagLabel(dato: string): string {
  const d = new Date(dato);
  if (isToday(d)) return "I dag";
  if (isTomorrow(d)) return "I morgen";
  return format(d, "EEEE d. MMMM", { locale: nb });
}

export default async function DashbordSide() {
  const supabase = await createClient();

  const iDag = new Date();
  const ar = iDag.getFullYear();
  const iDagStr = format(iDag, "yyyy-MM-dd");
  const ukeSlutt = format(endOfWeek(iDag, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [
    { data: dagensSesjoner },
    { data: ukensSesjoner },
    ytdInntekt,
    { data: alleFakturaer },
    { data: inntektRader },
    { data: ufakturerte },
  ] = await Promise.all([
    hentDagensSesjoner(),
    supabase
      .from("scheduled_sessions")
      .select("*, customers(id, short_name, hourly_rate)")
      .gte("scheduled_date", iDagStr)
      .lte("scheduled_date", ukeSlutt)
      .order("scheduled_date")
      .order("customer_id"),
    hentFakturainntektForAar(ar),
    // Utestående: inkl. kundeinfo og telefon
    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, status, customer_id, customers(short_name, lokasjon, rekvirent_telefon)")
      .in("status", ["sent", "overdue"])
      .order("due_date"),
    // Inntekt per kunde inneværende år
    supabase
      .from("invoices")
      .select("subtotal, customers(id, short_name)")
      .in("status", ["sent", "paid", "overdue"])
      .gte("invoice_date", `${ar}-01-01`)
      .lte("invoice_date", `${ar}-12-31`),
    // Alle ufakturerte timer
    supabase
      .from("session_log")
      .select("customer_id, actual_duration_h, line_amount, session_date, customers(short_name)")
      .eq("status", "pending_invoice")
      .order("session_date"),
  ]);

  // Utestående
  const ubetaltBelop = (alleFakturaer ?? []).reduce((sum, f) => sum + Number(f.total), 0);
  const forfaltAntall = (alleFakturaer ?? []).filter((f) => f.status === "overdue").length;

  const utestaaendeFakturaer: UtestaaendeFaktura[] = (alleFakturaer ?? []).map((f) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = f.customers as any;
    return {
      id: f.id as string,
      nummer: (f.invoice_number as string) ?? "—",
      total: Number(f.total),
      forfallsdato: f.due_date as string,
      status: f.status as "sent" | "overdue",
      kundeNavn: k?.short_name ?? "Ukjent",
      lokasjon: k?.lokasjon ?? null,
      telefon: k?.rekvirent_telefon ?? null,
    };
  });

  // Inntekt per kunde
  const inntektMap = new Map<string, InntektKunde>();
  for (const rad of inntektRader ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navn = (rad.customers as any)?.short_name ?? "Ukjent";
    const existing = inntektMap.get(navn) ?? { kundeNavn: navn, fakturert: 0, antall: 0 };
    existing.fakturert += Number(rad.subtotal);
    existing.antall += 1;
    inntektMap.set(navn, existing);
  }
  const inntektPerKunde = Array.from(inntektMap.values()).sort((a, b) => b.fakturert - a.fakturert);

  // Timer ufakturert per kunde
  const timerMap = new Map<string, TimerRad>();
  for (const rad of ufakturerte ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navn = (rad.customers as any)?.short_name ?? "Ukjent";
    const existing = timerMap.get(navn) ?? { kundeNavn: navn, timer: 0, belop: 0, datoer: [] };
    existing.timer += Number(rad.actual_duration_h);
    existing.belop += Number(rad.line_amount);
    if (!existing.datoer.includes(rad.session_date as string)) {
      existing.datoer.push(rad.session_date as string);
    }
    timerMap.set(navn, existing);
  }
  const timerPerKunde = Array.from(timerMap.values()).sort((a, b) => b.timer - a.timer);

  const timebankTotalt = timerPerKunde.reduce((s, k) => s + k.timer, 0);
  const timebankBelop = timerPerKunde.reduce((s, k) => s + k.belop, 0);

  // I dag
  const planlagteIdag = (dagensSesjoner ?? []).filter((s) => s.status === "planned").length;
  const dagensOppdrag: DagensOppdrag[] = (dagensSesjoner ?? []).map((s) => {
    const k = s.customers as { id: string; short_name: string } | null;
    return {
      id: s.id,
      kundeNavn: k?.short_name ?? "Ukjent",
      timer: Number(s.planned_duration_h),
      starttid: s.planned_start_time?.slice(0, 5) ?? null,
      status: s.status,
    };
  });

  // Ukeoversikt (unntatt i dag)
  const ukeDager = new Map<string, PlanlagtSesjonMedKunde[]>();
  for (const s of (ukensSesjoner as PlanlagtSesjonMedKunde[] | null) ?? []) {
    if (s.scheduled_date === iDagStr) continue;
    const liste = ukeDager.get(s.scheduled_date) ?? [];
    liste.push(s);
    ukeDager.set(s.scheduled_date, liste);
  }

  const dagensTittel = format(iDag, "EEEE d. MMMM", { locale: nb });

  return (
    <div className="flex flex-col gap-4">

      {/* Toppheader */}
      <div
        className="px-5 pt-5 pb-4 rounded-2xl"
        style={{
          background: "rgba(8,22,8,0.4)",
          border: "1px solid rgba(45,122,45,0.15)",
        }}
      >
        <p className="text-xs capitalize" style={{ color: "var(--text-dim)", letterSpacing: "0.5px" }}>
          {dagensTittel}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "0.5px" }}
          >
            Dashbord
          </h1>
          <div className="flex gap-2">
            <Link
              href="/timer"
              className="flex items-center justify-center py-2 px-3 rounded-xl text-xs transition-all"
              style={{
                background: "rgba(8,22,8,0.5)",
                border: "1px solid rgba(45,122,45,0.18)",
                color: "var(--text-dim)",
              }}
            >
              Timer
            </Link>
            <Link
              href="/fakturaer"
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all"
              style={{
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.28)",
                color: "#c9a84c",
              }}
            >
              <Plus size={13} strokeWidth={2} />
              Faktura
            </Link>
          </div>
        </div>
      </div>

      {/* Interaktive nøkkeltall */}
      <DashbordMetrikk
        ar={ar}
        ytdInntekt={ytdInntekt}
        inntektPerKunde={inntektPerKunde}
        ubetaltBelop={ubetaltBelop}
        forfaltAntall={forfaltAntall}
        utestaaendeFakturaer={utestaaendeFakturaer}
        timebankTotalt={timebankTotalt}
        timebankBelop={timebankBelop}
        timerPerKunde={timerPerKunde}
        planlagteIdag={planlagteIdag}
        dagensOppdrag={dagensOppdrag}
      />

      {/* Ukeoversikt (resten av uka) */}
      {ukeDager.size > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="section-label">Denne uken</span>
            <Link href="/timer" className="text-xs" style={{ color: "var(--text-dim)" }}>
              Se alle →
            </Link>
          </div>

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
                        {erPlanlagt && (
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
      )}
    </div>
  );
}
