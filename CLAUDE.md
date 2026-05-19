# MoiAcc — Norsk regnskapssystem for enkeltpersonforetak

## Prosjektoversikt
MoiAcc er et norskspråklig regnskaps- og faktureringssystem for én bruker (enkeltpersonforetak,
treningsinstruktør). Systemet håndterer timeregistrering, månedlig samlefakturering, bilagslagring,
skatteestimat og SAF-T-eksport i henhold til norsk bokføringslovgivning.

Eier: Jan Petter Jensen
Status: Grønt felt — ingen eksisterende kodebase

## Stack (ikke avvik fra dette)
- **Framework:** Next.js 16, App Router, TypeScript strict mode
- **Styling:** Tailwind CSS v4 + shadcn/ui (components.json i roten)
- **Backend/DB:** Supabase (prosjekt: eu-central-1 / Frankfurt)
- **Auth:** Supabase Auth, e-post + passord, MFA TOTP aktivert
- **PDF:** @react-pdf/renderer (IKKE Puppeteer)
- **E-post:** Resend (sending region: eu-west-1)
- **Fillagring:** Supabase Storage, privat bøtte
- **Deployment:** Vercel, region: fra1
- **Runtime:** Bun (ikke npm/yarn)
- **Språk i UI:** Norsk bokmål gjennomgående

## Kommandoer
```bash
bun install          # installer avhengigheter
bun dev              # utviklingsserver
bun build            # produksjonsbygg
bun typecheck        # tsc --noEmit
bun lint             # eslint
bun test             # vitest
bun db:generate      # supabase gen types typescript
bun db:push          # supabase db push
```

## Kodekonvensjoner

### Filstruktur
- Server Components som standard — legg til "use client" kun når nødvendig
- DB-spørringer samles i `lib/db/` (én fil per tabell, f.eks. `lib/db/invoices.ts`)
- Server Actions i `app/actions/` (én fil per domene)
- Route handlers kun for webhooks: `app/api/[webhook]/route.ts`
- PDF-komponenter i `components/pdf/`
- E-postmaler i `components/email/`

### TypeScript
- Strict mode på. Ingen `any`. Ingen `as` cast uten kommentar.
- Zod for all input-validering (forms, API-input, DB-output)
- Generer Supabase-typer med `bun db:generate` — bruk dem, ikke lag manuelle typer

### Supabase
- RLS på ALLE tabeller uten unntak — bruk `supabase gen types` for å verifisere
- Views: alltid `security_invoker = true`
- Storage policies: en policy per operasjon (SELECT, INSERT, UPDATE, DELETE)
- Aldri `SUPABASE_SERVICE_ROLE_KEY` i `NEXT_PUBLIC_`-variabler
- Bruk `supabase.auth.getUser()` server-side, aldri `getSession()` server-side

### Immutability-regler (lovpålagt — VIKTIG)
- Faktura med status `sent` eller `paid`: ingen UPDATE, kun INSERT av kreditnota
- `session_log.logged_at`: settes én gang, aldri oppdateres
- `invoices.sent_at`: settes én gang, aldri oppdateres
- `files.storage_path` + `files.sha256_hash`: immutable etter INSERT
- Fakturanummer (`invoice_number`): sekvensnummer fra DB-sekvens, ingen hull

### Feil og logging
- Bruk Result-pattern: `{ data, error }` fra Supabase — alltid håndter `error`
- Server Actions returnerer `{ success: boolean; error?: string }`
- Logg aldri sensitiv data (org.nr, beløp) til konsoll i produksjon

## Domenelogikk — kritiske regler

### MVA
- Alle eksisterende kunder: `vat_status = 'exempt_3_8'` (unntatt MVA, mval. § 3-8)
- Fakturaen skal ALLTID vise: "Unntatt MVA, jf. mval. § 3-8"
- vat_amount skal alltid være 0.00 for disse kundene — aldri null, alltid eksplisitt

### Fakturanummerering
- Én global sekvens per org.nummer — ingen hull, ingen manuell overstyring
- Implementert som PostgreSQL SEQUENCE med advisory lock ved INSERT

### Datoer
- Alle datoer lagres som `date` (YYYY-MM-DD) i Postgres — ingen tidssone-problemer
- Tidsstempler lagres som `timestamptz` i UTC
- Vis alltid i norsk format: `dd.MM.yyyy` (f.eks. 18.05.2026)
- Helligdager: forhåndsinnlastet fra `public_holidays`-tabellen for 2025–2030

### Pengebeløp
- Lagres som `numeric(12,2)` i Postgres — ALDRI floating point
- Beregninger gjøres i databasen der mulig, ikke i JavaScript

## Sikkerhet
- Alle miljøvariabler i `.env.local` (aldri i kode)
- `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY`: OK som public
- Alle andre Supabase-nøkler: server-side kun
- CSP-header konfigurert i `next.config.ts`

## Testing
- Vitest for unit-tester
- Playwright for E2E (fakturerings-flyt, PDF-generering)
- Test fakturavalidering mot alle krav i `@docs/fakturakrav.md`

## Hva Claude Code ALDRI skal gjøre
- Sende faktura uten at `approved_at` er satt — dette er lovpålagt
- Slette bokførte transaksjoner — bruk kreditnota
- Endre `invoice_number` etter at fakturaen er opprettet
- Lagre filer utenfor Supabase Storage (ikke lokalt filsystem i prod)
- Bruke `Math.random()` til noe sikkerhetsrelatert
- Skrive norske tegn (æøå) feil i UI-tekster

## Importer til detaljdokumentasjon
@docs/database-schema.md
@docs/fakturakrav.md
@docs/kunde-og-timeflyt.md
@docs/skattelogikk.md
