import { createClient } from "@/lib/supabase/server";

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
