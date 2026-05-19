# Fakturakrav — Norsk lovgivning (bokf.forsk. §5-1-1)

Alle fakturaer generert av MoiAcc MÅ inneholde disse feltene.
Claude Code: valider mot denne listen før PDF genereres.

## Obligatoriske felt (§5-1-1)

| Felt | Verdi / kilde | Eksempel |
|------|--------------|---------|
| Fakturanummer | Sekvensnummer fra DB | `2026-0042` |
| Fakturadato | `invoices.invoice_date` | `18.05.2026` |
| Selgers navn | Jan Petter Jensen | fast |
| Selgers adresse | Fra env-variabel | Lysaker, 1366 Lysaker |
| Selgers org.nr | Fra env-variabel | `XXX XXX XXX` |
| Kjøpers navn | `customers.legal_name` | `Equinor ASA` |
| Kjøpers adresse | `customers.invoice_address` | `Forusbeen 50, 4035 Stavanger` |
| Kjøpers org.nr | `customers.org_number` | `923 609 016` |
| Beskrivelse av ytelse | Tjenestebeskrivelse per linje | `Gruppetime 18.05.2026` |
| Leveringsdato | Dato per time fra `session_log` | `18.05.2026` |
| Vederlag eks. MVA | Per linje og sum | `2 400,00` |
| MVA-grunnlag | 0,00 (unntatt) | alltid eksplisitt |
| MVA-beløp | 0,00 | alltid eksplisitt |
| MVA-merknad | "Unntatt MVA, jf. mval. § 3-8" | alltid på fakturaen |
| Betalingsfrist | `invoices.due_date` | `01.06.2026` |
| Bankkonto | Fra env-variabel | IBAN + kontonummer |
| Faktureringsperiode | `period_from` – `period_to` | `01.05.2026 – 31.05.2026` |

## PDF-layout krav
- Selgerens firmanavn øverst, tydelig
- Fakturanummer og fakturadato fremtredende
- Linjetabell: dato | beskrivelse | timer | timesats | beløp
- Sum-seksjon: Subtotal, MVA (0,00), Total å betale
- Betalingsinformasjon: kontonummer, IBAN, KID (hvis brukt)
- Bunntekst: MVA-merknad + org.nr

## Norsk tallformat
- Desimalskilletegn: komma (`,`)
- Tusenskilletegn: punktum (`.`) eller mellomrom
- Valuta: NOK, alltid vist
- Eksempel: `2 400,00 NOK` eller `kr 2 400,00`

## Kreditnota-krav (§5-2-7)
- Merket tydelig "KREDITNOTA"
- Eget løpenummer i fakturekvensen
- Referanse til opprinnelig fakturanummer: "Krediterer faktura #2026-0042"
- Identiske felt som faktura, men negative beløp
- Kan IKKE endre eller slette original faktura

## Filformat
- PDF/A-1b (langtidslagring, bokfl.)
- Embedde fonter (Inter/Source Sans — støtter æøå)
- Lagres i Supabase Storage, `invoices-pdf`-bøtte
- SHA-256 hash beregnes og lagres i `files.sha256_hash`
