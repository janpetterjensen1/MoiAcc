"use server";

import { revalidatePath } from "next/cache";
import { hentAlleKunder } from "@/lib/db/customers";
import {
  hentUkemonstre,
  hentHelligdager,
  hentFerieperioder,
  opprettPlanlagteSesjoner,
  lagreUkemonster,
  slettUkemonster,
  leggTilFerieperiode,
  slettFerieperiode,
  type UkemonsterMedKunde,
} from "@/lib/db/calendar";
import { genererAarsplan } from "@/lib/calendar/year-plan";

export async function genererAarsplanAction(ar: number) {
  const [{ data: kunder }, { data: monstre }, { data: ferieperioder }] =
    await Promise.all([
      hentAlleKunder(),
      hentUkemonstre(),
      hentFerieperioder(`${ar}-01-01`, `${ar}-12-31`),
    ]);

  const { data: helligdager } = await hentHelligdager(
    `${ar}-01-01`,
    `${ar}-12-31`
  );

  if (!kunder || !monstre) {
    return { success: false, error: "Kunne ikke hente data" };
  }

  const aktiveKunder = kunder.filter(
    (k) => !k.active_to || new Date(k.active_to) >= new Date(`${ar}-01-01`)
  );

  const sesjoner = genererAarsplan(
    ar,
    aktiveKunder.map((k) => ({
      id: k.id,
      active_from: k.active_from,
      active_to: k.active_to,
    })),
    (monstre as UkemonsterMedKunde[]).map((m) => ({
      customer_id: m.customer_id,
      weekday: m.weekday,
      duration_h: m.duration_h,
    })),
    helligdager ?? [],
    ferieperioder ?? []
  );

  if (sesjoner.length === 0) {
    return { success: false, error: "Ingen sesjoner å generere — sjekk ukemønstre" };
  }

  const { error } = await opprettPlanlagteSesjoner(sesjoner);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kalender");
  return { success: true, antall: sesjoner.length };
}

export async function lagreUkemonsterAction(formData: FormData) {
  const customerId = formData.get("customer_id") as string;
  const weekday = Number(formData.get("weekday"));
  const durationH = Number(formData.get("duration_h"));

  if (!customerId || !weekday || !durationH) {
    return { success: false, error: "Mangler felt" };
  }

  const { error } = await lagreUkemonster(customerId, weekday, durationH);
  if (error) return { success: false, error: error.message };

  revalidatePath("/kalender");
  return { success: true };
}

export async function slettUkemonsterAction(customerId: string, weekday: number) {
  const { error } = await slettUkemonster(customerId, weekday);
  if (error) return { success: false, error: error.message };
  revalidatePath("/kalender");
  return { success: true };
}

export async function leggTilFerieAction(formData: FormData) {
  const fraDate = formData.get("fra_date") as string;
  const tilDate = formData.get("til_date") as string;
  const beskrivelse = formData.get("beskrivelse") as string;

  if (!fraDate || !tilDate || !beskrivelse) {
    return { success: false, error: "Mangler felt" };
  }

  const { error } = await leggTilFerieperiode(fraDate, tilDate, beskrivelse);
  if (error) return { success: false, error: error.message };

  revalidatePath("/kalender");
  return { success: true };
}

export async function slettFerieAction(id: string) {
  const { error } = await slettFerieperiode(id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/kalender");
  return { success: true };
}
