/**
 * Seed-script for eksisterende kunder.
 * Kjøres én gang: bun scripts/seed-customers.ts
 *
 * NB: Fyll inn juridisk navn og org.nr for alle tre kunder før kjøring.
 * Se docs/kunde-og-timeflyt.md.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const kunder = [
  {
    short_name: "Equinor ML33",
    legal_name: "EQUINOR ASA", // ← bekreft juridisk navn
    org_number: "923609016",   // ← bekreft org.nr
    invoice_address: {
      street: "Forusbeen 50",
      postal_code: "4035",
      city: "Stavanger",
    },
    invoice_email: "faktura@equinor.com", // ← fyll inn riktig e-post
    invoice_day_rule: "last_friday",
    payment_days: 14,
    hourly_rate: 773.0,
    vat_status: "exempt_3_8" as const,
    active_from: "2025-01-01",
  },
  {
    short_name: "Telenor",
    legal_name: "ABEL TECHNOLOGIES AS", // ← bekreft juridisk navn
    org_number: "000000000",            // ← fyll inn org.nr
    invoice_address: {
      street: "Snarøyveien 30",
      postal_code: "1360",
      city: "Fornebu",
    },
    invoice_email: "faktura@telenor.no", // ← fyll inn riktig e-post
    invoice_day_rule: "last_friday",
    payment_days: 14,
    hourly_rate: 1000.0,
    vat_status: "exempt_3_8" as const,
    active_from: "2025-11-01",
  },
  {
    short_name: "Aker S",
    legal_name: "AKER SOLUTIONS ASA",   // ← bekreft juridisk navn
    org_number: "000000000",            // ← fyll inn org.nr
    invoice_address: {
      street: "Oksenøyveien 10",
      postal_code: "1366",
      city: "Lysaker",
    },
    invoice_email: "faktura@akersolutions.com", // ← fyll inn riktig e-post
    invoice_day_rule: "last_friday",
    payment_days: 14,
    hourly_rate: 1000.0,
    vat_status: "exempt_3_8" as const,
    active_from: "2026-01-01",
  },
];

async function main() {
  console.log("Seeder kunder...");

  for (const kunde of kunder) {
    if (kunde.org_number === "000000000") {
      console.warn(`⚠ ${kunde.short_name}: org.nr ikke fylt inn — hopper over`);
      continue;
    }

    const { data, error } = await supabase
      .from("customers")
      .upsert(kunde, { onConflict: "org_number" })
      .select()
      .single();

    if (error) {
      console.error(`✗ ${kunde.short_name}:`, error.message);
    } else {
      console.log(`✓ ${kunde.short_name} (${data.id})`);
    }
  }

  console.log("Ferdig.");
}

main().catch(console.error);
