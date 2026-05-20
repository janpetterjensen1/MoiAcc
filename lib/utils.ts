import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNorskDato(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy", { locale: nb });
}

export function formatNorskBelop(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNorskValuta(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `kr ${formatNorskBelop(num)}`;
}
