export interface Produkt {
  navn: string;
  varighet_h: number;
  aktiv: boolean;
}

export const PRODUKTER: Produkt[] = [
  { navn: "Spinning 60 min",       varighet_h: 1.0, aktiv: true },
  { navn: "Spinning 90 min",       varighet_h: 1.5, aktiv: true },
  { navn: "Spinning Maraton 2,5t", varighet_h: 2.5, aktiv: true },
  { navn: "Sirkeltrening 60 min",  varighet_h: 1.0, aktiv: true },
  { navn: "One-on-one 60 min",     varighet_h: 1.0, aktiv: false },
];

export const AKTIVE_PRODUKTER = PRODUKTER.filter((p) => p.aktiv);

export function produktNavnFraVarighet(varighet_h: number): string {
  const produkt = PRODUKTER.find((p) => p.aktiv && p.varighet_h === varighet_h);
  return produkt?.navn ?? `Undervisning ${varighet_h}t`;
}
