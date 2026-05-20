import { addDays, format, startOfMonth, endOfMonth } from "date-fns";

export interface SesjonRad {
  id: string;
  customer_id: string;
  session_date: string;
  actual_duration_h: string;
  hourly_rate_at_time: string;
  line_amount: string;
  note: string | null;
}

export interface FakturaForslag {
  customer_id: string;
  invoice_date: string;
  due_date: string;
  period_from: string;
  period_to: string;
  subtotal: number;
  vat_amount: number;
  vat_exempt_note: string;
  linjer: SesjonRad[];
}

/**
 * Bygger et fakturaforslag fra session_log-rader for en hel måned.
 * period_from / period_to er alltid første og siste dag i fakturamåneden —
 * ikke avledet fra sesjonsdatoer — slik at fremtidige planlagte timer også dekkes.
 */
export function byggFakturaForslag(
  customerId: string,
  sesjoner: SesjonRad[],
  paymentDays: number,
  periodFra: string,
  periodTil: string,
): FakturaForslag | null {
  if (sesjoner.length === 0) return null;

  const iDag = new Date();
  const fakturadato = format(iDag, "yyyy-MM-dd");
  const forfallsdato = format(addDays(iDag, paymentDays), "yyyy-MM-dd");

  const subtotal = sesjoner.reduce((sum, s) => sum + Number(s.line_amount), 0);

  return {
    customer_id: customerId,
    invoice_date: fakturadato,
    due_date: forfallsdato,
    period_from: periodFra,
    period_to: periodTil,
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: 0,
    vat_exempt_note: "Unntatt MVA, jf. mval. § 3-8",
    linjer: sesjoner,
  };
}

export function innevarendeMaanedPeriode(): { fra: string; til: string } {
  const iDag = new Date();
  return {
    fra: format(startOfMonth(iDag), "yyyy-MM-dd"),
    til: format(endOfMonth(iDag), "yyyy-MM-dd"),
  };
}
