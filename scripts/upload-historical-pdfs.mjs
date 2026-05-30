/**
 * Last opp historiske faktura-PDF-er fra iCloud til Supabase Storage
 * og knytt dem til riktig faktura i DB via pdf_file_id.
 *
 * Kjør med: node scripts/upload-historical-pdfs.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://eptastodjhyanomzauti.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PDF_DIR = "/Users/janpetterjensen/Library/Mobile Documents/com~apple~CloudDocs/testfuckall/MoiAcc/Faktura";

if (!SERVICE_ROLE_KEY) {
  console.error("Sett SUPABASE_SERVICE_ROLE_KEY som env-variabel før kjøring");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Mapping: fakturanummer → {invoiceId, invoiceDate, customerId}
const faktura = [
  { num: "000101", id: "303ad7cb-51e3-492b-890c-1d77ab6b2873", date: "2024-01-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000102", id: "e02d335c-c0dc-4069-ad50-470b029e907a", date: "2024-02-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000103", id: "c6c2cd8d-1abb-4c8c-8d4a-d99b872e6dfa", date: "2024-03-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000104", id: "4b350623-80c9-4c93-bd89-1b74c8793a46", date: "2024-04-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000105", id: "27b9e556-1036-4c1f-bd3b-baee1c3f099b", date: "2024-05-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000106", id: "c0b59c99-1d11-42a6-9f0b-80e7422787f3", date: "2024-06-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000107", id: "24780439-61b4-4308-83df-85aba1207fe9", date: "2024-08-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000108", id: "eca30390-8d99-4bdf-ac42-f0a87b18a11f", date: "2024-09-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000109", id: "10434166-dc7e-441a-a935-6547a763119d", date: "2024-10-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000110", id: "86733b51-b088-43b7-8178-e6eed5ce16f1", date: "2024-11-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000111", id: "e5418bc5-3597-4ad2-9abc-47ad086def6f", date: "2024-12-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000112", id: "5a6356b4-f54e-4afd-8fa1-a3f168110b25", date: "2025-01-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000113", id: "86de4869-a02f-4f19-9feb-9b35140c79cf", date: "2025-02-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000114", id: "1d5e589d-c83f-45b0-bd20-5ae6ce748bf0", date: "2025-03-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000115", id: "87426804-9197-4f8c-ac66-689b0bd79ba2", date: "2025-04-22", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000116", id: "b5fb42f7-b83e-47bb-a496-12b566849aec", date: "2025-05-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000117", id: "bc32d37c-c5ab-41a1-8005-2bd575644dea", date: "2025-06-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000118", id: "cc1417d0-7527-4d7f-bede-899595044864", date: "2025-08-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000119", id: "f4278a49-1338-4964-999b-f4bcabf5d911", date: "2025-09-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000120", id: "c816e923-2702-4a51-bf13-725624cd2594", date: "2025-10-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000121", id: "b0735e52-dd7f-4dae-aea1-50ba4e10c12c", date: "2025-11-04", cid: "2671b35c-d512-439c-a672-ce5f2f6d0422" },
  { num: "000122", id: "dd2a850a-a28c-44d3-aeeb-d4af14d54482", date: "2025-11-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000123", id: "45b0604b-79e4-4dfa-8fe9-7427fae3688e", date: "2025-11-27", cid: "2671b35c-d512-439c-a672-ce5f2f6d0422" },
  { num: "000124", id: "f4421436-6e57-4ad3-9a55-434bb195031f", date: "2025-12-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000125", id: "2e872ecf-5c7a-4e7e-8fff-dbaae9ce20aa", date: "2025-12-15", cid: "2671b35c-d512-439c-a672-ce5f2f6d0422" },
  { num: "000126", id: "064057f3-d3d2-497f-ac45-b2af8698db12", date: "2026-01-21", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000127", id: "9be2f3cb-e4a3-4035-b3a2-ee4d1be330b2", date: "2026-01-31", cid: "2671b35c-d512-439c-a672-ce5f2f6d0422" },
  { num: "000128", id: "febaa23d-3dd5-4a65-8181-ca7d4e2c3650", date: "2026-02-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
  { num: "000130", id: "f93f6e12-8dc0-4f6a-9538-71f74226f1d3", date: "2026-02-28", cid: "2671b35c-d512-439c-a672-ce5f2f6d0422" },
  { num: "000131", id: "03df1a50-d6cb-4677-8b71-e7874cfdbe71", date: "2026-03-20", cid: "236b23a6-1fca-4035-a8c1-42ba42e4f5d5" },
];

async function upload(f) {
  const pdfPath = `${PDF_DIR}/Faktura ${f.num}.pdf`;
  if (!existsSync(pdfPath)) {
    console.log(`⚠️  ${f.num}: PDF ikke funnet på ${pdfPath}`);
    return;
  }

  const buf = readFileSync(pdfPath);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const filnavn = `Faktura ${f.num}.pdf`;
  const maaned = f.date.slice(0, 7);
  const storagePath = `${f.cid}/${maaned}/${filnavn}`;

  // 1. Last opp til Storage (upsert=true i tilfelle kjøres på nytt)
  const { error: upErr } = await supabase.storage
    .from("invoices-pdf")
    .upload(storagePath, buf, { contentType: "application/pdf", upsert: true });

  if (upErr) {
    console.error(`❌  ${f.num}: Storage-feil: ${upErr.message}`);
    return;
  }

  // 2. Opprett eller hent eksisterende fil-rad
  const retainUntil = new Date(f.date);
  retainUntil.setFullYear(retainUntil.getFullYear() + 7);

  const { data: fil, error: filErr } = await supabase
    .from("files")
    .insert({
      file_type: "invoice_pdf",
      original_filename: filnavn,
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_size_bytes: buf.length,
      sha256_hash: sha256,
      retain_until: retainUntil.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (filErr || !fil) {
    console.error(`❌  ${f.num}: files-insert feil: ${filErr?.message}`);
    return;
  }

  // 3. Knytt til faktura
  const { error: invErr } = await supabase
    .from("invoices")
    .update({ pdf_file_id: fil.id })
    .eq("id", f.id);

  if (invErr) {
    console.error(`❌  ${f.num}: invoice-update feil: ${invErr.message}`);
    return;
  }

  console.log(`✅  ${f.num} → ${storagePath} (${Math.round(buf.length / 1024)}KB)`);
}

console.log(`Laster opp ${faktura.length} historiske fakturaer...\n`);
for (const f of faktura) {
  await upload(f);
}
console.log("\nFerdig!");
