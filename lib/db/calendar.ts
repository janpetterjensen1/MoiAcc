import { createClient } from "@/lib/supabase/server";

export interface PlanlagtSesjonMedKunde {
  id: string;
  customer_id: string;
  scheduled_date: string;
  planned_duration_h: string;
  status: "planned" | "completed" | "sick" | "substitute" | "holiday" | "vacation" | "cancelled";
  blocked_reason: string | null;
  is_public_holiday: boolean;
  customers: { id: string; short_name: string } | null;
}

export async function hentPlanlagteSesjoner(fraDate: string, tilDate: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("scheduled_sessions")
    .select("*, customers(id, short_name)")
    .gte("scheduled_date", fraDate)
    .lte("scheduled_date", tilDate)
    .order("scheduled_date");
  return result as unknown as { data: PlanlagtSesjonMedKunde[] | null; error: typeof result.error };
}

export async function hentHelligdager(fraDate: string, tilDate: string) {
  const supabase = await createClient();
  return supabase
    .from("public_holidays")
    .select("*")
    .gte("holiday_date", fraDate)
    .lte("holiday_date", tilDate);
}

export async function hentFerieperioder(fraDate: string, tilDate: string) {
  const supabase = await createClient();
  return supabase
    .from("vacation_periods")
    .select("*")
    .lte("from_date", tilDate)
    .gte("to_date", fraDate)
    .order("from_date");
}

export interface UkemonsterMedKunde {
  id: string;
  customer_id: string;
  weekday: number;
  duration_h: string;
  notes: string | null;
  customers: { id: string; short_name: string; active_from: string; active_to: string | null } | null;
}

export async function hentUkemonstre() {
  const supabase = await createClient();
  const result = await supabase
    .from("week_patterns")
    .select("*, customers(id, short_name, active_from, active_to)")
    .order("weekday");
  return result as unknown as { data: UkemonsterMedKunde[] | null; error: typeof result.error };
}

export async function hentUkemonstrerForKunde(customerId: string) {
  const supabase = await createClient();
  return supabase
    .from("week_patterns")
    .select("*")
    .eq("customer_id", customerId)
    .order("weekday");
}

export async function lagreUkemonster(
  customerId: string,
  weekday: number,
  durationH: number
) {
  const supabase = await createClient();
  return supabase
    .from("week_patterns")
    .upsert(
      { customer_id: customerId, weekday, duration_h: durationH },
      { onConflict: "customer_id,weekday" }
    );
}

export async function slettUkemonster(customerId: string, weekday: number) {
  const supabase = await createClient();
  return supabase
    .from("week_patterns")
    .delete()
    .eq("customer_id", customerId)
    .eq("weekday", weekday);
}

export async function leggTilFerieperiode(
  fraDate: string,
  tilDate: string,
  beskrivelse: string
) {
  const supabase = await createClient();
  return supabase
    .from("vacation_periods")
    .insert({ from_date: fraDate, to_date: tilDate, description: beskrivelse })
    .select()
    .single();
}

export async function slettFerieperiode(id: string) {
  const supabase = await createClient();
  return supabase.from("vacation_periods").delete().eq("id", id);
}

export async function opprettPlanlagteSesjoner(
  sesjoner: Array<{
    customer_id: string;
    scheduled_date: string;
    planned_duration_h: number;
    status: "planned" | "holiday" | "vacation";
    blocked_reason?: string;
    is_public_holiday?: boolean;
  }>
) {
  const supabase = await createClient();
  return supabase
    .from("scheduled_sessions")
    .upsert(sesjoner, { onConflict: "customer_id,scheduled_date" });
}
