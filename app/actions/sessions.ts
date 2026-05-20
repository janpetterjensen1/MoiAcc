"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  opprettSesjonlogg,
  oppdaterPlanlagtStatus,
  hentPlanlagtSesjon,
} from "@/lib/db/sessions";

export async function loggAdHocEvent(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke innlogget" };

  const customerId = formData.get("customer_id") as string;
  const dato = formData.get("dato") as string;
  const varighetH = Number(formData.get("varighet_h"));
  const notat = (formData.get("notat") as string) || null;

  if (!customerId || !dato || !varighetH) {
    return { error: "Mangler påkrevde felt" };
  }

  const { data: kunde } = await supabase
    .from("customers")
    .select("hourly_rate")
    .eq("id", customerId)
    .single();

  if (!kunde) return { error: "Fant ikke kunde" };

  const { error } = await opprettSesjonlogg({
    scheduled_session_id: null,
    customer_id: customerId,
    session_date: dato,
    actual_duration_h: varighetH,
    hourly_rate_at_time: Number(kunde.hourly_rate),
    status: "pending_invoice",
    note: notat,
    logged_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/timer");
  revalidatePath("/dashbord");
}

type FraværType = "sick" | "substitute" | "vacation";

export async function kvitterGjennomfort(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const sesjonId = formData.get("sesjon_id") as string;
  const customerId = formData.get("customer_id") as string;
  const sesjonDate = formData.get("sesjon_date") as string;
  const varighetH = Number(formData.get("varighet_h"));
  const timesats = Number(formData.get("timesats"));
  const notat = (formData.get("notat") as string) || null;

  if (!sesjonId || !customerId || !sesjonDate || !varighetH || !timesats) {
    return redirect(`/timer/${sesjonId}?feil=` + encodeURIComponent("Mangler felt"));
  }

  const { error: loggFeil } = await opprettSesjonlogg({
    scheduled_session_id: sesjonId,
    customer_id: customerId,
    session_date: sesjonDate,
    actual_duration_h: varighetH,
    hourly_rate_at_time: timesats,
    status: "pending_invoice",
    note: notat,
    logged_by: user.id,
  });

  if (loggFeil) {
    return redirect(`/timer/${sesjonId}?feil=` + encodeURIComponent(loggFeil.message));
  }

  await oppdaterPlanlagtStatus(sesjonId, "completed");
  revalidatePath("/timer");
  revalidatePath("/dashbord");
  redirect(`/timer?kvittert=${customerId}`);
}

export async function kvitterFravar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const sesjonId = formData.get("sesjon_id") as string;
  const customerId = formData.get("customer_id") as string;
  const sesjonDate = formData.get("sesjon_date") as string;
  const timesats = Number(formData.get("timesats"));
  const fravarType = formData.get("fravar_type") as FraværType;
  const notat = (formData.get("notat") as string) || null;

  const logStatus: Record<FraværType, "sick" | "substitute" | "vacation"> = {
    sick: "sick",
    substitute: "substitute",
    vacation: "vacation",
  };

  const planlagtStatus: Record<FraværType, "sick" | "substitute" | "vacation"> = {
    sick: "sick",
    substitute: "substitute",
    vacation: "vacation",
  };

  // Hent planlagt varighet for å lagre historikk (beløp = 0 for fravær)
  const { data: planlagt } = await hentPlanlagtSesjon(sesjonId);

  await opprettSesjonlogg({
    scheduled_session_id: sesjonId,
    customer_id: customerId,
    session_date: sesjonDate,
    actual_duration_h: planlagt ? Number(planlagt.planned_duration_h) : 0,
    hourly_rate_at_time: timesats,
    status: logStatus[fravarType],
    note: notat,
    logged_by: user.id,
  });

  await oppdaterPlanlagtStatus(sesjonId, planlagtStatus[fravarType]);
  revalidatePath("/timer");
  revalidatePath("/dashbord");
  redirect("/timer");
}
