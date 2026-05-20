// Supabase Edge Function — kjøres daglig 06:00 CET via cron
// Deploy: supabase functions deploy invoice-scheduler
// Cron:   supabase functions schedule invoice-scheduler --cron "0 5 * * *" (05:00 UTC = 06:00 CET)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Kunde {
  id: string;
  short_name: string;
  invoice_day_rule: string;
  payment_days: number;
  active_from: string;
  active_to: string | null;
  invoice_email: string;
}

interface SesjonRad {
  id: string;
  session_date: string;
  actual_duration_h: number;
  hourly_rate_at_time: number;
  line_amount: number;
}

function sisteFredagIManed(ar: number, maned: number): string {
  let d = new Date(ar, maned, 0); // siste dag i måneden
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function sisteHverdagIManed(ar: number, maned: number): string {
  let d = new Date(ar, maned, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function erFakturadagIdag(rule: string): boolean {
  const iDag = new Date();
  const ar = iDag.getFullYear();
  const maned = iDag.getMonth() + 1;
  const datoStr = iDag.toISOString().slice(0, 10);

  let fakturadato: string;
  switch (rule) {
    case "last_friday":
      fakturadato = sisteFredagIManed(ar, maned);
      break;
    case "last_weekday":
      fakturadato = sisteHverdagIManed(ar, maned);
      break;
    case "day_25":
      fakturadato = `${ar}-${String(maned).padStart(2, "0")}-25`;
      break;
    case "day_20":
      fakturadato = `${ar}-${String(maned).padStart(2, "0")}-20`;
      break;
    case "last_thursday": {
      let d = new Date(ar, maned, 0);
      while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
      fakturadato = d.toISOString().slice(0, 10);
      break;
    }
    default:
      return false;
  }
  return fakturadato === datoStr;
}

Deno.serve(async (req) => {
  // Tillat kun autoriserte kall (cron eller manuelt med service role)
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const iDag = new Date().toISOString().slice(0, 10);
  const resultater: string[] = [];

  // Hent alle aktive kunder
  const { data: kunder, error: kundeFeil } = await supabase
    .from("customers")
    .select("id, short_name, invoice_day_rule, payment_days, active_from, active_to, invoice_email")
    .or(`active_to.is.null,active_to.gte.${iDag}`);

  if (kundeFeil || !kunder) {
    return new Response(JSON.stringify({ error: kundeFeil?.message }), { status: 500 });
  }

  for (const kunde of kunder as Kunde[]) {
    if (!erFakturadagIdag(kunde.invoice_day_rule)) continue;

    // Sjekk om det allerede er laget en faktura i dag for denne kunden
    const { data: eksisterende } = await supabase
      .from("invoices")
      .select("id")
      .eq("customer_id", kunde.id)
      .eq("invoice_date", iDag)
      .maybeSingle();

    if (eksisterende) {
      resultater.push(`${kunde.short_name}: allerede fakturert i dag`);
      continue;
    }

    // Hent pending sesjoner
    const { data: sesjoner } = await supabase
      .from("session_log")
      .select("id, session_date, actual_duration_h, hourly_rate_at_time, line_amount")
      .eq("customer_id", kunde.id)
      .eq("status", "pending_invoice")
      .order("session_date");

    if (!sesjoner || sesjoner.length === 0) {
      resultater.push(`${kunde.short_name}: ingen pending sesjoner`);
      continue;
    }

    const subtotal = (sesjoner as SesjonRad[]).reduce(
      (sum, s) => sum + Number(s.line_amount),
      0
    );

    const forfallsdato = new Date();
    forfallsdato.setDate(forfallsdato.getDate() + kunde.payment_days);

    const periodeSesjoner = (sesjoner as SesjonRad[]).map((s) => s.session_date).sort();

    // Opprett faktura
    const { data: faktura, error: fakturaFeil } = await supabase
      .from("invoices")
      .insert({
        customer_id: kunde.id,
        invoice_date: iDag,
        due_date: forfallsdato.toISOString().slice(0, 10),
        period_from: periodeSesjoner[0],
        period_to: periodeSesjoner[periodeSesjoner.length - 1],
        subtotal: Math.round(subtotal * 100) / 100,
        vat_amount: 0,
        vat_exempt_note: "Unntatt MVA, jf. mval. § 3-8",
        status: "awaiting_approval",
        // created_by settes til service role UUID — OK for automatisk oppretting
        created_by: "00000000-0000-0000-0000-000000000000",
      })
      .select()
      .single();

    if (fakturaFeil || !faktura) {
      resultater.push(`${kunde.short_name}: FEIL — ${fakturaFeil?.message}`);
      continue;
    }

    // Oppdater sesjoner til invoiced
    await supabase
      .from("session_log")
      .update({ status: "invoiced", invoice_id: faktura.id })
      .in("id", (sesjoner as SesjonRad[]).map((s) => s.id));

    resultater.push(`${kunde.short_name}: faktura #${faktura.invoice_number} opprettet (${subtotal} kr)`);
  }

  return new Response(
    JSON.stringify({ dato: iDag, resultater }),
    { headers: { "Content-Type": "application/json" } }
  );
});
