# Kunde- og timeflyt

## Eksisterende kunder (fra Excel-import)

| Kallenavn | Juridisk navn | Aktiv fra | Timesats | Ukedag(er) | Varighet |
|-----------|--------------|-----------|----------|------------|----------|
| Equinor ML33 | (juridisk navn bekreftes) | 2025-01-01 | 773 kr/t | Tirsdag + Torsdag | Tirs: 1,5t (2,5t ca. hver 3. uke), Tors: 1t |
| Telenor | Abel Technologies AS | 2025-11-01 | 1 000 kr/t | Torsdag | 1t |
| Aker S | (juridisk navn bekreftes) | 2026-01-01 | 1 000 kr/t | Mandag | 1t |

**NB:** Juridisk navn og org.nummer for alle tre kunder må bekreftes av bruker
og legges inn i `.env.local` eller som seed-data før produksjonsstart.

## Timekvitterings-flyt (mobil)

### Gjennomført time
1. Bruker åpner dagens oppdrag fra dashbord
2. Trykker "Kvittér gjennomført"
3. Kan justere faktisk varighet (f.eks. 1,5t → 2,5t for Equinor-tirsdager)
4. Valgfritt: legger til notat
5. System skriver én rad i `session_log` med `status = 'pending_invoice'`
6. System oppdaterer `scheduled_sessions.status = 'completed'`
7. Bekreftelsesmelding viser timebank-status for kunden denne måneden

### Fravær (syk / vikar / ferie)
1. Bruker velger fraværstype fra tre knapper: Syk | Vikar | Ferie
2. System skriver rad i `session_log` med tilhørende status
3. `line_amount = 0` — faktureres ikke
4. Raden beholdes i historikken for statistikk

### Helligdager (automatisk)
- Hentes fra `public_holidays`-tabellen
- Vises som røde dager i kalender — ingen handling nødvendig
- `scheduled_sessions.is_public_holiday = true`, `status = 'holiday'`

## Faktureringsmotor

### Trigger
Kjøres daglig (Supabase Edge Function cron, 06:00 CET):
1. For hver aktiv kunde: beregn neste fakturadato basert på `invoice_day_rule`
2. Hvis `today == neste_fakturadato`: opprett fakturakompilering
3. Hent alle `session_log`-rader med `status = 'pending_invoice'` for kunden
4. Opprett `invoices`-rad med `status = 'awaiting_approval'`
5. Oppdater `session_log.invoice_id` og `session_log.status = 'invoiced'`
6. Send push-varsel til bruker

### `invoice_day_rule` — implementasjon
```typescript
function getNextInvoiceDate(rule: string, fromDate: Date): Date {
  switch (rule) {
    case 'last_friday':    // siste fredag i måneden
    case 'last_weekday':   // siste hverdag i måneden
    case 'day_25':         // 25. i måneden
    // osv.
  }
}
```

### Godkjenning (kreves alltid — LOVPÅLAGT)
1. Push-varsel: "Faktura klar til godkjenning — Equinor ML33, 4 360,50 kr"
2. Bruker ser fakturaforslag med alle tidslinjer
3. Kan redigere: justere linjer, legge til rabatt, slette feil-kvittert time
4. Trykker "Godkjenn og send"
5. System setter `approved_at = now()`
6. PDF genereres og lagres i Supabase Storage
7. E-post sendes via Resend med PDF som vedlegg
8. `status = 'sent'`, `sent_at = now()` (immutable)
9. Fakturanummer tildeles permanent

### Viktig: faktura kan ALDRI sendes uten `approved_at`
Dette håndheves av DB-trigger (`check_invoice_approval`) OG application-lag.

## Årsplan-generering

```typescript
// Genererer scheduled_sessions for ett år
async function generateYearPlan(
  customerId: string,
  year: number,
  weeklyPattern: WeeklyPattern[]  // [{weekday: 1, durationH: 1.0}] (1=mandag)
) {
  // Hent alle helligdager for året
  // For hver dato: sjekk om helligdag, generer rad
  // Equinor-tirsdager: standard 1.5t, marker annenhver 3. uke som 2.5t-kandidat
}
```

## Excel-import (historikk 2025–2026)
- Fil: `Timer_2026.xlsx` (og 2025-ark)
- Import-script: `scripts/import-excel.ts`
- Mapper: Dato → session_date, Time → actual_duration_h, Timesats → hourly_rate_at_time
- 0-timer med kommentar → fraværsregistrering (type avgjøres av kommentartekst)
- Faktura sendt/utbetalt → historisk faktura med `status = 'paid'`, låst
- Alle importerte rader markeres med `import_source = 'excel_2025'` / `'excel_2026'`
