import {
  eachDayOfInterval,
  getDay,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

interface WeekPattern {
  customer_id: string;
  weekday: number; // 1=mandag, 7=søndag
  duration_h: string;
  start_time?: string | null; // "HH:MM:SS" fra DB
}

interface Customer {
  id: string;
  active_from: string;
  active_to: string | null;
}

interface Holiday {
  holiday_date: string;
  name: string;
}

interface VacationPeriod {
  from_date: string;
  to_date: string;
  description: string;
}

// date-fns: getDay() returnerer 0=søndag, 1=mandag ... 6=lørdag
// Vi bruker 1=mandag ... 7=søndag
function isoWeekday(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 7 : d;
}

export function genererAarsplan(
  ar: number,
  kunder: Customer[],
  ukemonstre: WeekPattern[],
  helligdager: Holiday[],
  ferieperioder: VacationPeriod[]
) {
  const fraDate = new Date(ar, 0, 1);
  const tilDate = new Date(ar, 11, 31);
  const alleDager = eachDayOfInterval({ start: fraDate, end: tilDate });

  const helligdagSet = new Set(helligdager.map((h) => h.holiday_date));
  const helligdagNavn = new Map(helligdager.map((h) => [h.holiday_date, h.name]));

  const sesjoner: Array<{
    customer_id: string;
    scheduled_date: string;
    planned_duration_h: number;
    planned_start_time?: string | null;
    status: "planned" | "holiday" | "vacation";
    blocked_reason?: string;
    is_public_holiday?: boolean;
  }> = [];

  for (const kunde of kunder) {
    const kundeMonster = ukemonstre.filter(
      (m) => m.customer_id === kunde.id
    );
    if (kundeMonster.length === 0) continue;

    const aktivFra = parseISO(kunde.active_from);
    const aktivTil = kunde.active_to ? parseISO(kunde.active_to) : new Date(2099, 0, 1);

    for (const dag of alleDager) {
      if (dag < aktivFra || dag > aktivTil) continue;

      const datoStr = format(dag, "yyyy-MM-dd");
      const ukedag = isoWeekday(dag);
      const monster = kundeMonster.find((m) => m.weekday === ukedag);
      if (!monster) continue;

      const startTid = monster.start_time ?? null;

      // Helligdag?
      if (helligdagSet.has(datoStr)) {
        sesjoner.push({
          customer_id: kunde.id,
          scheduled_date: datoStr,
          planned_duration_h: Number(monster.duration_h),
          planned_start_time: startTid,
          status: "holiday",
          blocked_reason: helligdagNavn.get(datoStr),
          is_public_holiday: true,
        });
        continue;
      }

      // Ferieperiode?
      const ferie = ferieperioder.find((f) =>
        isWithinInterval(dag, {
          start: parseISO(f.from_date),
          end: parseISO(f.to_date),
        })
      );
      if (ferie) {
        sesjoner.push({
          customer_id: kunde.id,
          scheduled_date: datoStr,
          planned_duration_h: Number(monster.duration_h),
          planned_start_time: startTid,
          status: "vacation",
          blocked_reason: ferie.description,
        });
        continue;
      }

      // Vanlig planlagt sesjon
      sesjoner.push({
        customer_id: kunde.id,
        scheduled_date: datoStr,
        planned_duration_h: Number(monster.duration_h),
        planned_start_time: startTid,
        status: "planned",
      });
    }
  }

  return sesjoner;
}
