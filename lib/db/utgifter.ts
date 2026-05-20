import { createClient } from "@/lib/supabase/server";

export interface UtgiftRad {
  id: string;
  expense_date: string;
  account_code: string;
  description: string;
  amount_gross: number;
  supplier_name: string | null;
  receipt_file_id: string | null;
  customer_id: string | null;
  created_at: string;
  files?: {
    storage_path: string;
    original_filename: string;
    mime_type: string;
  } | null;
}

export interface FilInsert {
  file_type: "receipt";
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  retain_until: string;
}

export interface UtgiftInsert {
  expense_date: string;
  account_code: string;
  description: string;
  amount_gross: number;
  supplier_name?: string | null;
  receipt_file_id?: string | null;
  customer_id?: string | null;
}

export async function hentAlleUtgifter() {
  const supabase = await createClient();
  return supabase
    .from("expenses" as any)
    .select("*, files(storage_path, original_filename, mime_type)")
    .order("expense_date", { ascending: false });
}

export async function hentUtgift(id: string) {
  const supabase = await createClient();
  return supabase
    .from("expenses" as any)
    .select("*, files(storage_path, original_filename, mime_type)")
    .eq("id", id)
    .single();
}

export async function opprettFil(data: FilInsert) {
  const supabase = await createClient();
  return supabase
    .from("files" as any)
    .insert(data)
    .select()
    .single();
}

export async function opprettUtgift(data: UtgiftInsert) {
  const supabase = await createClient();
  return supabase
    .from("expenses" as any)
    .insert(data)
    .select()
    .single();
}
