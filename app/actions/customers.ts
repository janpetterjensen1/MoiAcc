"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { opprettKunde, oppdaterKunde, hentKunde, loggKundeEndring } from "@/lib/db/customers";
import { slaOppOrgnummer } from "@/lib/brreg";

const kundeSchema = z.object({
  short_name: z.string().min(1),
  legal_name: z.string().min(1),
  org_number: z.string().regex(/^\d{9}$/, "Org.nr må være 9 siffer"),
  invoice_email: z.string().email("Ugyldig e-post"),
  invoice_day_rule: z.enum(["last_friday", "last_weekday", "day_25"]),
  payment_days: z.coerce.number().int().min(1).max(60),
  hourly_rate: z.coerce.number().positive("Timesats må være positiv"),
  active_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active_to: z.string().optional(),
  notes: z.string().optional(),
  invoice_address_street: z.string().min(1),
  invoice_address_postal_code: z.string().regex(/^\d{4}$/, "Postnummer må være 4 siffer"),
  invoice_address_city: z.string().min(1),
});

export async function opprettKundeAction(formData: FormData) {
  const raw = {
    short_name: formData.get("short_name"),
    legal_name: formData.get("legal_name"),
    org_number: (formData.get("org_number") as string)?.replace(/\s/g, ""),
    invoice_email: formData.get("invoice_email"),
    invoice_day_rule: formData.get("invoice_day_rule"),
    payment_days: formData.get("payment_days"),
    hourly_rate: formData.get("hourly_rate"),
    active_from: formData.get("active_from"),
    active_to: formData.get("active_to") || undefined,
    notes: formData.get("notes") || undefined,
    invoice_address_street: formData.get("invoice_address_street"),
    invoice_address_postal_code: formData.get("invoice_address_postal_code"),
    invoice_address_city: formData.get("invoice_address_city"),
  };

  const parsed = kundeSchema.safeParse(raw);
  if (!parsed.success) {
    const feil = parsed.error.issues[0]?.message ?? "Valideringsfeil";
    return redirect("/kunder/ny?feil=" + encodeURIComponent(feil));
  }

  const d = parsed.data;
  const { data, error } = await opprettKunde({
    short_name: d.short_name,
    legal_name: d.legal_name,
    org_number: d.org_number,
    invoice_email: d.invoice_email,
    invoice_day_rule: d.invoice_day_rule,
    payment_days: d.payment_days,
    hourly_rate: d.hourly_rate,
    active_from: d.active_from,
    active_to: d.active_to ?? null,
    notes: d.notes ?? null,
    vat_status: "exempt_3_8",
    invoice_address: {
      street: d.invoice_address_street,
      postal_code: d.invoice_address_postal_code,
      city: d.invoice_address_city,
    },
  });

  if (error || !data) {
    return redirect("/kunder/ny?feil=" + encodeURIComponent(error?.message ?? "Ukjent feil"));
  }

  redirect(`/kunder/${data.id}`);
}

export async function oppdaterKundeAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const raw = {
    short_name: formData.get("short_name"),
    legal_name: formData.get("legal_name"),
    org_number: (formData.get("org_number") as string)?.replace(/\s/g, ""),
    invoice_email: formData.get("invoice_email"),
    invoice_day_rule: formData.get("invoice_day_rule"),
    payment_days: formData.get("payment_days"),
    hourly_rate: formData.get("hourly_rate"),
    active_from: formData.get("active_from"),
    active_to: formData.get("active_to") || undefined,
    notes: formData.get("notes") || undefined,
    invoice_address_street: formData.get("invoice_address_street"),
    invoice_address_postal_code: formData.get("invoice_address_postal_code"),
    invoice_address_city: formData.get("invoice_address_city"),
  };

  const parsed = kundeSchema.safeParse(raw);
  if (!parsed.success) {
    const feil = parsed.error.issues[0]?.message ?? "Valideringsfeil";
    return redirect(`/kunder/${id}?feil=` + encodeURIComponent(feil));
  }

  const { data: gammel } = await hentKunde(id);

  const d = parsed.data;
  const { data: ny, error } = await oppdaterKunde(id, {
    short_name: d.short_name,
    legal_name: d.legal_name,
    org_number: d.org_number,
    invoice_email: d.invoice_email,
    invoice_day_rule: d.invoice_day_rule,
    payment_days: d.payment_days,
    hourly_rate: d.hourly_rate,
    active_from: d.active_from,
    active_to: d.active_to ?? null,
    notes: d.notes ?? null,
    invoice_address: {
      street: d.invoice_address_street,
      postal_code: d.invoice_address_postal_code,
      city: d.invoice_address_city,
    },
  });

  if (error || !ny) {
    return redirect(`/kunder/${id}?feil=` + encodeURIComponent(error?.message ?? "Ukjent feil"));
  }

  if (gammel) {
    await loggKundeEndring(id, gammel, ny, user.id);
  }

  redirect(`/kunder/${id}?lagret=1`);
}

export async function slaOppBrregAction(orgnr: string) {
  return slaOppOrgnummer(orgnr);
}
