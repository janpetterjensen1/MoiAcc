# MoiAcc — Byggespesifikasjon for Claude Code

Bruk denne filen som startpunkt. Kjør én fase om gangen i Claude Code.
Start hver fase med: "Les CLAUDE.md og bygg [fasenavn] i henhold til spesifikasjonen."

---

## Fase 1: Prosjektscaffolding og infrastruktur (Uke 1)

### 1.1 Next.js-prosjekt
```bash
bunx create-next-app@latest moiacc \
  --typescript \
  --tailwind \
  --app \
  --turbopack \
  --no-src-dir \
  --import-alias "@/*"
```

### 1.2 Avhengigheter
```bash
# UI
bun add @radix-ui/react-slot class-variance-authority clsx tailwind-merge
bun add lucide-react
bunx shadcn@latest init

# Supabase
bun add @supabase/supabase-js @supabase/ssr

# PDF
bun add @react-pdf/renderer

# E-post
bun add resend @react-email/components @react-email/render

# Validering
bun add zod @hookform/resolvers react-hook-form

# Datoer (norsk format)
bun add date-fns
bun add date-fns-tz

# Dev
bun add -D @types/node vitest @vitejs/plugin-react playwright
```

### 1.3 Supabase-oppsett
1. Opprett prosjekt på supabase.com, velg region: eu-central-1 (Frankfurt)
2. Kjør alle migrasjoner fra `@docs/database-schema.md` i Supabase SQL Editor
3. Aktiver RLS på alle tabeller
4. Legg til `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[prosjekt-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
RESEND_API_KEY=[resend-key]

# Selgerinfo (fast for Jan Petter Jensen ENK)
SELLER_NAME="Jan Petter Jensen"
SELLER_ADDRESS="[adresse]"
SELLER_ORG_NUMBER="[org.nr]"
SELLER_BANK_ACCOUNT="[kontonummer]"
SELLER_IBAN="[IBAN]"
```
5. `bun db:generate` — generer TypeScript-typer

### 1.4 Vercel
- Koble repo til Vercel
- Sett `"regions": ["fra1"]` i `vercel.json`
- Legg til alle `.env.local`-variabler i Vercel Environment Variables

---

## Fase 2: Autentisering og grunnoppsett (Uke 1–2)

Bygg:
- Supabase Auth med e-post + passord
- MFA TOTP aktivert (obligatorisk før produksjon)
- Middleware for rutebeskyttelse (`middleware.ts`)
- Login-side (`app/login/page.tsx`)
- Dashbord-layout (`app/(dashboard)/layout.tsx`)
- PWA-manifest (`public/manifest.json`) med app-navn "MoiAcc"
- Service Worker (Workbox) for offline-støtte

---

## Fase 3: Kundeadministrasjon (Uke 2)

Bygg:
- Kundeoversikt (`app/(dashboard)/kunder/page.tsx`)
- Kundeprofil med alle felt fra `@docs/database-schema.md`
- Brønnøysund-validering av org.nummer (API: `https://data.brreg.no/enhetsregisteret/api/enheter/[orgnr]`)
- Kontraktimport: filopplasting → AI-parsing med Anthropic API → forhåndsutfylt skjema
- Redigeringslogg (audit_log) for endringer

Seed-data (kjøres én gang):
```typescript
// scripts/seed-customers.ts
// Importer eksisterende kunder fra Excel-data
// Se @docs/kunde-og-timeflyt.md for detaljer
```

---

## Fase 4: Årsplan og kalender (Uke 2–3)

Bygg:
- Kalendervisning (måned/uke/dag) med fargekoding per kunde
- Ukemønster-editor per kunde (mandag 1t, tirsdag 1,5t etc.)
- Årsplan-generator (fyller `scheduled_sessions` for ett år)
- Helligdagsimport: forhåndsinnlast norske helligdager 2025–2030 i `public_holidays`
- Ferieperiode-registrering (blokkerer alle kunder)

---

## Fase 5: Timekvittering (Uke 3)

Bygg (mobil-first):
- Dagens oppdrag-widget på dashbord
- Kvitterings-skjerm med:
  - Varighet-juster (default fra ukemønster, kan endres)
  - Fraværsknapper: Syk | Vikar | Ferie
  - Valgfritt notat
- Server Action: `actions/sessions.ts` → `logSession()`
- Bekreftelsesmelding med timebank-status

---

## Fase 6: Faktureringsmotor (Uke 4–5)

Bygg:
- `lib/invoice/compiler.ts` — henter pending sessions, bygger fakturaforslag
- `lib/invoice/date-rules.ts` — `getNextInvoiceDate()` for alle regler
- Supabase Edge Function (cron): `supabase/functions/invoice-scheduler/index.ts`
  - Kjøres: daglig 06:00 CET
  - Opprett awaiting_approval-fakturaer automatisk
- Push-varsel (Web Push API) ved ny faktura klar
- Fakturaforslag-side med:
  - Tidslinjetabell med dato, beskrivelse, timer, sats, beløp
  - Redigeringsmodus
  - Godkjenn-knapp (setter `approved_at`)
  - Avbryt-knapp (sletter draft)
- DB-trigger `check_invoice_approval` (fra schema) — verifiser at den er aktiv

---

## Fase 7: PDF-generering og e-postutsendelse (Uke 5)

Bygg:
- `components/pdf/InvoicePdf.tsx` — fakturamal med alle felt fra `@docs/fakturakrav.md`
  - Bruk Source Sans 3 font (støtter æøå, gratis)
  - Norsk tallformat: komma som desimalskilletegn
- Route handler: `app/api/invoice/[id]/pdf/route.ts`
- Server Action: `actions/invoices.ts` → `sendInvoice(invoiceId)`
  1. Generer PDF
  2. Lagre i Supabase Storage (`invoices-pdf`-bøtte)
  3. Beregn SHA-256 hash
  4. Lagre i `files`-tabell
  5. Send e-post via Resend med PDF vedlegg
  6. Sett `sent_at = now()` og `status = 'sent'`
- E-postmal: `components/email/InvoiceEmail.tsx`

---

## Fase 8: Kostnadsregistrering og kvittering (Uke 6)

Bygg:
- Kostnadsregistrering med NS 4102-kontovelger
- Kamera-capture for kvittering (`<input type="file" capture="environment">`)
- Bildeopplasting til Supabase Storage (`receipts`-bøtte)
- SHA-256-verifisering ved opplasting

---

## Fase 9: Skatteestimat-widget (Uke 6–7)

Bygg:
- `lib/tax/estimator.ts` — algoritme fra `@docs/skattelogikk.md`
- Skattewidget på dashbord:
  - Estimert årsoverskudd
  - Estimert total skatt
  - Felt for manuell innlegging av utskrevet forskuddsskatt
  - Gap-indikator
  - Neste termin med nedtelling og Altinn-lenke
- Cron (Edge Function): oppdater `tax_estimates` daglig

---

## Fase 10: Overholdelse og eksport (Uke 7–8)

Bygg:
- SAF-T XML-eksport (bokf.forsk. §7-8)
  - Edge Function: `supabase/functions/saft-export/index.ts`
  - Standard SAF-T Financial versjon 1.30
  - Testvalidering mot Skatteetatens SAF-T-validator
- Betalingsregistrering (marker faktura som betalt)
- Purring/purrevarsel (faktura forfalt)
- Dokumentarkiv med 5-årig oppbevaringsstatus

---

## Fase 11: Excel-import og historikk (Uke 8)

Bygg:
- `scripts/import-excel.ts` — importerer `Timer_2026.xlsx` (og 2025-ark)
  - Mappe-logikk fra `@docs/kunde-og-timeflyt.md`
  - Tørr-kjøring med rapport før faktisk import
  - Alle importerte rader merkes med `import_source`
- Historisk fakturavisning (låste, ikke-redigerbare)

---

## Etter go-live: Fase 12 (Q4 2026)

- Storecove Peppol/EHF-integrasjon
- `EInvoiceProvider`-interface med Storecove-implementasjon
- UBL 2.1 XML-generator
- Test mot anskaffelser.dev EHF-validator
- Registrering i ELMA-registeret

---

## Viktige testscenarier (skriv før kode)

```typescript
// Fakturanummerering — ingen hull
// Godkjenning — kan ikke sende uten approved_at
// Immutability — sent_at kan ikke endres
// MVA — alltid 0.00, alltid eksplisitt
// Norsk datoformat — 18.05.2026, ikke 2026-05-18
// Helligdager — 1. mai og 17. mai blokkert for alle
// SHA-256 — hash stemmer ved nedlasting
```
