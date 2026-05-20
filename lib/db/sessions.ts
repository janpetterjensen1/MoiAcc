import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export interface PlanlagtSesjonMedKunde {
  id: string;
  customer_id: string;
  scheduled_date: string;
  planned_duration_h: string;
  status: "planned" | "completed" | "sick" | "substitute" | "holiday" | "vacation" | "cancelled";
  blocked_reason: string | null;
  is_public_holiday: boolean;
  customers: { id: string; short_name: string; hourly_rate: string } | null;
}

export interface SesjonloggMedKunde {
  id: string;
  customer_id: string;
  session_date: string;
  actual_duration_h: string;
  hourly_rate_at_time: string;
  line_amount: string;
  status: "pending_invoice" | "invoiced" | "sick" | "substitute" | "vacation";
  invoice_id: string | null;
  note: string | null;
  logged_at: string;
  customers: { id: string; short_name: string } | null;
}

export async function hentDagensSesjoner(dato?: string) {
  const supabase = await createClient();
  const datoStr = dato ?? format(new Date(), "yyyy-MM-dd");
  const result = await supabase
    .from("scheduled_sessions")
    .select("*, customers(id, short_name, hourly_rate)")
    .eq("scheduled_date", datoStr)
    .order("customer_id");
  return result as unknown as { data: PlanlagtSesjonMedKunde[] | null; error: { message: string } | null };
}

export async function hentPlanlagtSesjon(id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("scheduled_sessions")
    .select("*, customers(id, short_name, hourly_rate)")
    .eq("id", id)
    .single();
  return result as unknown as { data: PlanlagtSesjonMedKunde | null; error: { message: string } | null };
}

export async function hentTimebankForKunde(customerId: string, ar: number, maned: number) {
  const supabase = await createClient();
  const fraStr = `${ar}-${String(maned).padStart(2, "0")}-01`;
  const tilStr = new Date(ar, maned, 0).toISOString().slice(0, 10);
  const result = await supabase
    .from("session_log")
    .select("actual_duration_h, line_amount, status, session_date")
    .eq("customer_id", customerId)
    .gte("session_date", fraStr)
    .lte("session_date", tilStr)
    .order("session_date");
  return result as unknown as {
    data: { actual_duration_h: string; line_amount: string; status: string; session_date: string }[] | null;
    error: { message: string } | null;
  };
}

export async function hentSesjonloggForManed(ar: number, maned: number) {
  const supabase = await createClient();
  const fraStr = `${ar}-${String(maned).padStart(2, "0")}-01`;
  const tilStr = new Date(ar, maned, 0).toISOString().slice(0, 10);
  const result = await supabase
    .from("session_log")
    .select("*, customers(id, short_name)")
    .gte("session_date", fraStr)
    .lte("session_date", tilStr)
    .order("session_date", { ascending: false });
  return result as unknown as { data: SesjonloggMedKunde[] | null; error: { message: string } | null };
}

export async function opprettSesjonlogg(data: {
  scheduled_session_id: string | null;
  customer_id: string;
  session_date: string;
  actual_duration_h: number;
  hourly_rate_at_time: number;
  status: "pending_invoice" | "sick" | "substitute" | "vacation";
  note: string | null;
  logged_by: string;
}) {
  const supabase = await createClient();
  return supabase.from("session_log").insert(data).select().single();
}

export async function hentSesjoner(fraDato: string, tilDato: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("scheduled_sessions")
    .select("*, customers(id, short_name, hourly_rate)")
    .gte("scheduled_date", fraDato)
    .lte("scheduled_date", tilDato)
    .order("scheduled_date")
    .order("customer_id");
  return result as unknown as { data: PlanlagtSesjonMedKunde[] | null; error: { message: string } | null };
}

export async function oppdaterPlanlagtStatus(
  id: string,
  status: "completed" | "sick" | "substitute" | "vacation"
) {
  const supabase = await createClient();
  return supabase.from("scheduled_sessions").update({ status }).eq("id", id);
}
