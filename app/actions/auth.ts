"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loggInn(formData: FormData) {
  const supabase = await createClient();

  const epost = formData.get("epost") as string;
  const passord = formData.get("passord") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email: epost,
    password: passord,
  });

  if (error) {
    return redirect("/login?feil=" + encodeURIComponent(error.message));
  }

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    aalData?.nextLevel === "aal2" &&
    aalData.nextLevel !== aalData.currentLevel
  ) {
    return redirect("/login/mfa");
  }

  redirect("/dashbord");
}

export async function loggUt() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function verifiserMfa(formData: FormData) {
  const supabase = await createClient();
  const kode = formData.get("kode") as string;

  const { data: faktorer } = await supabase.auth.mfa.listFactors();
  const totpFaktor = faktorer?.totp?.[0];

  if (!totpFaktor) {
    return redirect("/login?feil=" + encodeURIComponent("Ingen MFA-faktor funnet"));
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totpFaktor.id });

  if (challengeError || !challenge) {
    return redirect(
      "/login/mfa?feil=" + encodeURIComponent(challengeError?.message ?? "Ukjent feil")
    );
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFaktor.id,
    challengeId: challenge.id,
    code: kode,
  });

  if (verifyError) {
    return redirect(
      "/login/mfa?feil=" + encodeURIComponent(verifyError.message)
    );
  }

  redirect("/dashbord");
}
