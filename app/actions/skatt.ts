"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function hentSkattConfig(year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { annen_inntekt: 0, forskuddsskatt_utskrevet: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("skatt_config")
    .select("annen_inntekt, forskuddsskatt_utskrevet")
    .eq("user_id", user.id)
    .eq("year", year)
    .single();

  return {
    annen_inntekt: Number(data?.annen_inntekt ?? 0),
    forskuddsskatt_utskrevet: Number(data?.forskuddsskatt_utskrevet ?? 0),
  };
}

export async function lagreSkattConfig(
  year: number,
  annenInntekt: number,
  forskuddsskattUtskrevet: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke innlogget" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("skatt_config")
    .upsert(
      {
        user_id: user.id,
        year,
        annen_inntekt: annenInntekt,
        forskuddsskatt_utskrevet: forskuddsskattUtskrevet,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year" },
    );

  if (error) return { error: error.message };

  revalidatePath("/skatt");
  revalidatePath("/profil");
  return {};
}
