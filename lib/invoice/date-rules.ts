import {
  endOfMonth,
  getDay,
  subDays,
  setDate,
  isWeekend,
  isFriday,
  format,
  addMonths,
} from "date-fns";

type InvoiceDayRule = "last_friday" | "last_weekday" | "day_25" | "day_20" | "last_thursday";

/**
 * Beregner neste fakturadato for en gitt regel, fra og med fromDate.
 * Returnerer datoen som YYYY-MM-DD.
 */
export function getNextInvoiceDate(rule: InvoiceDayRule, fromDate: Date): string {
  const kandidater = [fromDate, addMonths(fromDate, 1)].map((base) => {
    return beregnFakturadato(rule, base);
  });

  // Finn første kandidat >= fromDate
  const fraStr = format(fromDate, "yyyy-MM-dd");
  const valgt = kandidater.find((d) => d >= fraStr) ?? kandidater[1];
  return valgt;
}

function beregnFakturadato(rule: InvoiceDayRule, innenforManed: Date): string {
  switch (rule) {
    case "last_friday":
      return format(sisteFredagIManed(innenforManed), "yyyy-MM-dd");
    case "last_weekday":
      return format(sisteHverdagIManed(innenforManed), "yyyy-MM-dd");
    case "day_25": {
      const d = setDate(innenforManed, 25);
      return format(d, "yyyy-MM-dd");
    }
    case "day_20": {
      const d = setDate(innenforManed, 20);
      return format(d, "yyyy-MM-dd");
    }
    case "last_thursday":
      return format(sisteUkedagIManed(innenforManed, 4), "yyyy-MM-dd");
  }
}

function sisteFredagIManed(dato: Date): Date {
  let d = endOfMonth(dato);
  while (!isFriday(d)) {
    d = subDays(d, 1);
  }
  return d;
}

function sisteHverdagIManed(dato: Date): Date {
  let d = endOfMonth(dato);
  while (isWeekend(d)) {
    d = subDays(d, 1);
  }
  return d;
}

// weekday: 0=søn, 1=man, ..., 4=tor, 5=fre
function sisteUkedagIManed(dato: Date, weekday: number): Date {
  let d = endOfMonth(dato);
  while (getDay(d) !== weekday) {
    d = subDays(d, 1);
  }
  return d;
}

/**
 * Sjekker om i dag er fakturadato for en kunde.
 */
export function erFakturadagIdag(rule: InvoiceDayRule): boolean {
  const iDag = new Date();
  const fakturadato = beregnFakturadato(rule, iDag);
  return fakturadato === format(iDag, "yyyy-MM-dd");
}
