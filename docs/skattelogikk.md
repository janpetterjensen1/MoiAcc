# Skattelogikk — ENK treningsinstruktør 2026

## Skattestruktur
Enkeltpersonforetak beskattes etter foretaksmodellen (sktl. §§12-10 – 12-14).

### Satser 2026
| Komponent | Sats | Grunnlag |
|-----------|------|----------|
| Alminnelig inntektsskatt | 22 % | Overskudd |
| Trygdeavgift næringsinntekt | 10,8 % | Personinntekt |
| Trinnskatt trinn 1 | 1,7 % | Over 226 100 kr |
| Trinnskatt trinn 2 | 4,0 % | Over 318 300 kr |
| Trinnskatt trinn 3 | 13,7 % | Over 725 050 kr |
| Trinnskatt trinn 4 | 16,8 % | Over 980 100 kr |
| Trinnskatt trinn 5 | 17,8 % | Over 1 467 200 kr |

### Marginalskatt (topp) ≈ 50,6 %

## Estimeringsalgoritme

```typescript
function estimateTax(params: {
  ytdRevenue: number,        // fakturert hittil i år
  ytdExpenses: number,       // kostnader hittil i år
  currentDayOfYear: number   // for skalering til helår
}): TaxEstimate {

  const ytdProfit = params.ytdRevenue - params.ytdExpenses;

  // Skaler til helår basert på hittil
  const annualProfit = (ytdProfit / params.currentDayOfYear) * 365;

  // Personinntekt ≈ overskudd (forenklet — ingen kapitalvarer)
  const personalIncome = annualProfit;

  // Alminnelig inntektsskatt
  const ordinaryTax = annualProfit * 0.22;

  // Trygdeavgift
  const nationalInsurance = personalIncome * 0.108;

  // Trinnskatt
  const stepTax = calculateStepTax(personalIncome);

  const totalTax = ordinaryTax + nationalInsurance + stepTax;

  return {
    estimatedAnnualProfit: annualProfit,
    estimatedTax: totalTax,
    effectiveRate: totalTax / annualProfit
  };
}

function calculateStepTax(income: number): number {
  let tax = 0;
  if (income > 226_100) tax += (Math.min(income, 318_300) - 226_100) * 0.017;
  if (income > 318_300) tax += (Math.min(income, 725_050) - 318_300) * 0.040;
  if (income > 725_050) tax += (Math.min(income, 980_100) - 725_050) * 0.137;
  if (income > 980_100) tax += (Math.min(income, 1_467_200) - 980_100) * 0.168;
  if (income > 1_467_200) tax += (income - 1_467_200) * 0.178;
  return tax;
}
```

## Forskuddsskatt

### Terminer 2026
| Termin | Forfall |
|--------|---------|
| 1 | 15. mars 2026 |
| 2 | 15. juni 2026 |
| 3 | 15. september 2026 |
| 4 | 15. desember 2026 |

### Tilleggsforskudd
Siste frist: 31. mai 2027 (rentefritt)

### Kritisk regel (skattebetalingsloven §10-20)
Betales én termin ikke innen 7 dager etter forfall, forfaller HELE årets
gjenstående forskuddsskatt umiddelbart.

**MoiAcc skal varsle brukeren 14 dager og 7 dager før hver termin.**

### UI — skatteestimat-widget
Viser alltid:
- Estimert årsoverskudd (skalert fra YTD)
- Estimert total skatt
- Utskrevet forskuddsskatt fra Altinn (brukeren legger inn manuelt)
- Gap: "Du bør vurdere å øke med X kr" eller "Ser bra ut"
- Neste termin: dato + beløp + knapp til Altinn

## Fradragsberettigede kostnader (relevante kontoer)

| Konto | Beskrivelse | Merknad |
|-------|-------------|---------|
| 6000 | Treningsutstyr < 30 000 kr | Direkte kostnadsføring |
| 6540 | Driftsutstyr > 30 000 kr | Aktiveres, saldo d (20 %/år) |
| 7000 | Bilkostnader / kjørebok | 3,50 kr/km, kjørebok obligatorisk |
| 7100 | Kurs og faglig utvikling | Vedlikeholdende kompetanse |
| 7320 | Mobiltelefon | Tilbakef. privat fordel 4 392 kr/år |
| 7350 | Hjemmekontor (sjablong) | Maks 2 240 kr/år (2026) |
| 7400 | Forsikringer næring | Yrkesskade, ansvar |
| 7700 | Bankgebyrer | |
| 7770 | Regnskaps-/programvarekostnad | MoiAcc-abonnement |

## MVA-terskelvarsel
- Gjelder KUN MVA-pliktig omsetning (konto 3200+)
- Unntatt omsetning (3000, 3100) teller IKKE
- Varsle ved 80 % av 50 000 kr = 40 000 kr
- Krev registrering ved > 50 000 kr (rullerende 12 mnd)
