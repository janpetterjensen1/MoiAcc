import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export async function hentAlleKunder() {
  const supabase = await createClient();
  return supabase
    .from("customers")
    .select("*")
    .order("short_name");
}

export async function hentKunde(id: string) {
  const supabase = await createClient();
  return supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
}

export async function opprettKunde(data: CustomerInsert) {
  const supabase = await createClient();
  return supabase
    .from("customers")
    .insert(data)
    .select()
    .single();
}

export async function oppdaterKunde(id: string, data: CustomerUpdate) {
  const supabase = await createClient();
  return supabase
    .from("customers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

export async function hentKundeEndringslogg(id: string) {
  const supabase = await createClient();
  return supabase
    .from("audit_log")
    .select("*")
    .eq("table_name", "customers")
    .eq("record_id", id)
    .order("changed_at", { ascending: false })
    .limit(20);
}

export async function loggKundeEndring(
  kundeId: string,
  gammelData: Customer,
  nyData: Customer,
  brukerId: string
) {
  const supabase = await createClient();
  return supabase.from("audit_log").insert({
    table_name: "customers",
    record_id: kundeId,
    action: "UPDATE" as const,
    old_data: gammelData as unknown as import("@/lib/db/database.types").Json,
    new_data: nyData as unknown as import("@/lib/db/database.types").Json,
    changed_by: brukerId,
  });
}
