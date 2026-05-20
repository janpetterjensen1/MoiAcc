"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { opprettFil, opprettUtgift } from "@/lib/db/utgifter";
import { createHash } from "crypto";
import { randomUUID } from "crypto";

export async function registrerUtgift(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const expense_date = formData.get("expense_date") as string;
  const account_code = formData.get("account_code") as string;
  const description = formData.get("description") as string;
  const amount_gross = parseFloat(formData.get("amount_gross") as string);
  const supplier_name = (formData.get("supplier_name") as string) || null;
  const customer_id = (formData.get("customer_id") as string) || null;
  const receiptFile = formData.get("receipt") as File | null;

  let receipt_file_id: string | null = null;

  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split(".").pop() ?? "bin";
    const fileUuid = randomUUID();
    const storagePath = `${user.id}/${fileUuid}.${ext}`;

    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    const sha256Hash = createHash("sha256").update(buffer).digest("hex");

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, buffer, {
        contentType: receiptFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Feil ved opplasting av kvittering: ${uploadError.message}`);
    }

    // retain_until = today + 5 years (bokføringsloven §13)
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + 5);
    const retainUntilStr = retainUntil.toISOString().slice(0, 10);

    const { data: filRad, error: filFeil } = await opprettFil({
      file_type: "receipt",
      original_filename: receiptFile.name,
      storage_path: storagePath,
      mime_type: receiptFile.type,
      file_size_bytes: receiptFile.size,
      sha256_hash: sha256Hash,
      retain_until: retainUntilStr,
    });

    if (filFeil || !filRad) {
      throw new Error(`Feil ved lagring av filinfo: ${filFeil?.message}`);
    }

    receipt_file_id = (filRad as any).id as string;
  }

  const { error: utgiftFeil } = await opprettUtgift({
    expense_date,
    account_code,
    description,
    amount_gross,
    supplier_name,
    customer_id,
    receipt_file_id,
  });

  if (utgiftFeil) {
    throw new Error(`Feil ved lagring av utgift: ${utgiftFeil.message}`);
  }

  revalidatePath("/utgifter");
  redirect("/utgifter");
}
