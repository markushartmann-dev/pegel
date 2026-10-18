/**
 * Sparschwein: Belohnung für Tage ohne erfasste Getränke.
 *
 * Regeln (Beträge konfigurierbar, Standard):
 *  - Jeder abgeschlossene Kalendertag ohne Eintrag:                5 €
 *  - Jede volle Woche am Stück (7., 14., 21. … Tag einer Serie):  +10 €
 *  - Jeder komplette Kalendermonat ohne Eintrag:                  +20 €
 *
 * Gezählt werden nur abgeschlossene Tage (bis gestern) ab dem Registrierungstag.
 * Ein Monat zählt nur, wenn alle seine Tage im gezählten Zeitraum liegen.
 * Der heutige Tag kommt erst nach Mitternacht dazu.
 */
import { addDays, daysBetween, lastOfMonth } from "./dates";

export interface SavingsRules {
  perDay: number;
  weekBonus: number;
  monthBonus: number;
}

export const DEFAULT_SAVINGS_RULES: SavingsRules = { perDay: 5, weekBonus: 10, monthBonus: 20 };

export type SavingsEventType = "day" | "week" | "month";

export interface SavingsEvent {
  day: string;
  type: SavingsEventType;
  amount: number;
}

export interface SavingsResult {
  /** Summe in Euro */
  total: number;
  dryDays: number;
  weekBonuses: number;
  monthBonuses: number;
  /** Tage ohne Eintrag am Stück, endend gestern */
  currentStreak: number;
  longestStreak: number;
  /** Tage bis zum nächsten Wochenbonus (1–7) */
  daysToWeekBonus: number;
  countedDays: number;
  events: SavingsEvent[];
}

/**
 * @param startDay   erster gezählter Tag ("YYYY-MM-DD", z. B. Registrierungstag)
 * @param endDay     letzter gezählter Tag (inklusive, normalerweise gestern)
 * @param drinkDays  Tage mit mindestens einem Eintrag
 */
export function computeSavings(
  startDay: string,
  endDay: string,
  drinkDays: Iterable<string>,
  rules: SavingsRules = DEFAULT_SAVINGS_RULES,
): SavingsResult {
  const empty: SavingsResult = {
    total: 0,
    dryDays: 0,
    weekBonuses: 0,
    monthBonuses: 0,
    currentStreak: 0,
    longestStreak: 0,
    daysToWeekBonus: 7,
    countedDays: 0,
    events: [],
  };
  if (endDay < startDay) return empty;

  const drinking = new Set(drinkDays);
  const days = daysBetween(startDay, endDay);
  const events: SavingsEvent[] = [];
  let streak = 0;
  let longest = 0;
  let dryDays = 0;
  let weekBonuses = 0;
  let monthBonuses = 0;
  let monthDry = true;

  for (const day of days) {
    const dry = !drinking.has(day);
    if (dry) {
      dryDays++;
      streak++;
      longest = Math.max(longest, streak);
      events.push({ day, type: "day", amount: rules.perDay });
      if (streak % 7 === 0) {
        weekBonuses++;
        events.push({ day, type: "week", amount: rules.weekBonus });
      }
    } else {
      streak = 0;
      monthDry = false;
    }
    // Monatsende: Bonus nur für komplett gezählte und komplett trockene Monate
    if (day === lastOfMonth(day)) {
      const monthStart = `${day.slice(0, 7)}-01`;
      if (monthDry && monthStart >= startDay) {
        monthBonuses++;
        events.push({ day, type: "month", amount: rules.monthBonus });
      }
      monthDry = true;
    }
  }

  return {
    total: events.reduce((a, e) => a + e.amount, 0),
    dryDays,
    weekBonuses,
    monthBonuses,
    currentStreak: streak,
    longestStreak: longest,
    daysToWeekBonus: 7 - (streak % 7),
    countedDays: days.length,
    events,
  };
}

/** Summe der Ereignisse in einem Zeitraum (inklusive Grenzen). */
export function savingsBetween(events: readonly SavingsEvent[], fromDay: string, toDay: string): number {
  return events.filter((e) => e.day >= fromDay && e.day <= toDay).reduce((a, e) => a + e.amount, 0);
}

/** Letzter abgeschlossener Tag relativ zu "heute". */
export const yesterdayOf = (today: string) => addDays(today, -1);
