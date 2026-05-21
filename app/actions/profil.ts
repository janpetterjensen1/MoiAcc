"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function oppdaterProfil(
  visningsnavn: string,
  tittel: string,
  telefon: string,
  orgFelter?: {
    org_number: string;
    bank_account: string;
    iban: string;
    address: string;
    postal_code: string;
    city: string;
    invoice_email: string;
  },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke innlogget" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .upsert(
      {
        id: user.id,
        visningsnavn: visningsnavn.trim(),
        tittel: tittel.trim(),
        telefon: telefon.trim(),
        ...(orgFelter && {
          org_number:    orgFelter.org_number.trim(),
          bank_account:  orgFelter.bank_account.trim(),
          iban:          orgFelter.iban.trim(),
          address:       orgFelter.address.trim(),
          postal_code:   orgFelter.postal_code.trim(),
          city:          orgFelter.city.trim(),
          invoice_email: orgFelter.invoice_email.trim(),
        }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) return { error: (error as { message: string }).message };

  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return {};
}

export async function lagreAvatar(avatarUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke innlogget" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .upsert(
      { id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return {};
}
