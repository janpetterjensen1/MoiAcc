"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { opprettSesjonlogg, oppdaterPlanlagtStatus } from "@/lib/db/sessions";

/**
 * Geocode en kundes fakturaadresse via Nominatim (OpenStreetMap) og lagre koordinatene.
 */
export async function geocodeKundeAction(kundeId: string): Promise<
  { ok: true; lat: number; lng: number; display: string } | { ok: false; feil: string }
> {
  const supabase = await createClient();

  const { data: kunde, error } = await supabase
    .from("customers")
    .select("invoice_address, short_name")
    .eq("id", kundeId)
    .single();

  if (error || !kunde) return { ok: false, feil: "Fant ikke kunden" };

  const adr = kunde.invoice_address as { street: string; postal_code: string; city: string };
  const query = encodeURIComponent(`${adr.street}, ${adr.postal_code} ${adr.city}, Norway`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  let json: { lat: string; lon: string; display_name: string }[];
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MoiAcc/1.0 (jan.petter@example.com)" },
      next: { revalidate: 86400 },
    });
    json = await res.json();
  } catch {
    return { ok: false, feil: "Nettverksfeil mot Nominatim" };
  }

  if (!json || json.length === 0) {
    return { ok: false, feil: "Fant ikke adressen. Prøv å sette koordinater manuelt." };
  }

  const { lat: latStr, lon: lngStr, display_name } = json[0];
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const { error: updateErr } = await supabase
    .from("customers")
    .update({ lat, lng })
    .eq("id", kundeId);

  if (updateErr) return { ok: false, feil: updateErr.message };

  revalidatePath(`/kunder/${kundeId}`);
  return { ok: true, lat, lng, display: display_name };
}

/**
 * Sett koordinater manuelt for en kunde.
 */
export async function settKoordinaterAction(
  kundeId: string,
  lat: number,
  lng: number,
  radiusM: number
): Promise<{ ok: true } | { ok: false; feil: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ lat, lng, geofence_radius_m: radiusM })
    .eq("id", kundeId);

  if (error) return { ok: false, feil: error.message };
  revalidatePath(`/kunder/${kundeId}`);
  return { ok: true };
}

/**
 * Hent dagens planlagte sesjoner med kundekoordinater — brukes av GeofenceVakt.
 * Returnerer bare sesjoner med status "planned" som har koordinater satt.
 */
export async function hentDagensGeoSesjoner(): Promise<{
  id: string;
  customer_id: string;
  short_name: string;
  planned_duration_h: number;
  lat: number;
  lng: number;
  geofence_radius_m: number;
}[]> {
  const supabase = await createClient();
  const dagStr = format(new Date(), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("scheduled_sessions")
    .select(`
      id,
      customer_id,
      planned_duration_h,
      customers!inner (short_name, lat, lng, geofence_radius_m)
    `)
    .eq("scheduled_date", dagStr)
    .eq("status", "planned");

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .filter((r) => r.customers?.lat != null && r.customers?.lng != null)
    .map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      short_name: r.customers.short_name,
      planned_duration_h: Number(r.planned_duration_h),
      lat: r.customers.lat,
      lng: r.customers.lng,
      geofence_radius_m: r.customers.geofence_radius_m ?? 300,
    }));
}

/**
 * Auto-kvittering utløst av geofence.
 */
export async function autoKvitterAction(
  sesjonId: string,
  customerId: string,
  sesjonDate: string,
  varighetH: number
): Promise<{ ok: true } | { ok: false; feil: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, feil: "Ikke innlogget" };

  const { data: kunde } = await supabase
    .from("customers")
    .select("hourly_rate")
    .eq("id", customerId)
    .single();

  if (!kunde) return { ok: false, feil: "Fant ikke kunde" };

  const { error: loggFeil } = await opprettSesjonlogg({
    scheduled_session_id: sesjonId,
    customer_id: customerId,
    session_date: sesjonDate,
    actual_duration_h: varighetH,
    hourly_rate_at_time: Number(kunde.hourly_rate),
    status: "pending_invoice",
    note: "Auto-kvittert via geofencing",
    logged_by: user.id,
  });

  if (loggFeil) return { ok: false, feil: loggFeil.message };

  await oppdaterPlanlagtStatus(sesjonId, "completed");
  revalidatePath("/timer");
  revalidatePath("/dashbord");
  return { ok: true };
}
