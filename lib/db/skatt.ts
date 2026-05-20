import { createClient } from "@/lib/supabase/server";

export interface KontoSum {
  account_code: string;
  sum: number;
}

export async function hentUtgifterPerKontoForAar(aar: number): Promise<KontoSum[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses" as any)
    .select("account_code, amount_gross")
    .gte("expense_date", `${aar}-01-01`)
    .lte("expense_date", `${aar}-12-31`);
  if (error || !data) return [];
  const map: Record<string, number> = {};
  for (const r of data as { account_code: string; amount_gross: number }[]) {
    map[r.account_code] = (map[r.account_code] ?? 0) + Number(r.amount_gross);
  }
  return Object.entries(map)
    .map(([account_code, sum]) => ({ account_code, sum }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));
}

export async function hentFakturainntektForAar(aar: number) {
  const supabase = await createClient();
  const fra = `${aar}-01-01`;
  const til = `${aar}-12-31`;
  const { data, error } = await supabase
    .from("invoices")
    .select("total")
    .in("status", ["sent", "paid"])
    .gte("invoice_date", fra)
    .lte("invoice_date", til);
  if (error || !data) return 0;
  return data.reduce((sum, r) => sum + Number(r.total), 0);
}

export async function hentUtgifterForAar(aar: number) {
  const supabase = await createClient();
  const fra = `${aar}-01-01`;
  const til = `${aar}-12-31`;
  const { data, error } = await supabase
    .from("expenses")
    .select("amount_gross")
    .gte("expense_date", fra)
    .lte("expense_date", til);
  if (error || !data) return 0;
  return data.reduce((sum, r) => sum + Number(r.amount_gross), 0);
}
