import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDato(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fakturaer, error } = await (supabase as any)
    .from("invoices")
    .select("invoice_number, invoice_date, due_date, period_from, period_to, subtotal, vat_amount, total, status, sent_at, paid_at, customers(short_name, legal_name, org_number)")
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: true });

  if (error) return new NextResponse("Feil ved henting", { status: 500 });

  const statusNavn: Record<string, string> = {
    awaiting_approval: "Til godkjenning",
    sent:    "Sendt",
    paid:    "Betalt",
    overdue: "Forfalt",
    credited:"Kreditert",
  };

  const header = [
    "Fakturanummer",
    "Kunde",
    "Org.nr kunde",
    "Fakturadato",
    "Forfallsdato",
    "Periode fra",
    "Periode til",
    "Subtotal",
    "MVA",
    "Total",
    "Status",
    "Sendt dato",
    "Betalt dato",
  ].map(csvEscape).join(",");

  const rader = (fakturaer ?? []).map((f: any) => [
    csvEscape(f.invoice_number),
    csvEscape(f.customers?.short_name ?? f.customers?.legal_name ?? ""),
    csvEscape(f.customers?.org_number ?? ""),
    csvEscape(formatDato(f.invoice_date)),
    csvEscape(formatDato(f.due_date)),
    csvEscape(formatDato(f.period_from)),
    csvEscape(formatDato(f.period_to)),
    csvEscape(Number(f.subtotal).toFixed(2).replace(".", ",")),
    csvEscape(Number(f.vat_amount).toFixed(2).replace(".", ",")),
    csvEscape(Number(f.total).toFixed(2).replace(".", ",")),
    csvEscape(statusNavn[f.status] ?? f.status),
    csvEscape(formatDato(f.sent_at)),
    csvEscape(formatDato(f.paid_at)),
  ].join(","));

  const csv = [header, ...rader].join("\r\n");
  const iDag = new Date().toISOString().slice(0, 10);

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fakturaer-${iDag}.csv"`,
    },
  });
}
