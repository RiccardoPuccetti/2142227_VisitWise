import type { GeoPoint, PlanDay, PlannedVisit, PlanningMode } from '../../core/models/api.models';

/** Working days shown in each week of the calendar (US-28). */
const WEEKDAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  /** Plan days of that date: one per agent when the calendar shows every agent. */
  entries: PlanDay[];
}

export interface CalendarWeek {
  /** YYYY-MM-DD of the Monday. */
  monday: string;
  /** Monday to Friday. */
  days: CalendarDay[];
}

export interface VisitStop {
  visit: PlannedVisit;
  /** OpenStreetMap directions from the previous stop (the base for the first visit of the day). */
  directions: string;
}

/** Name shown for the agent of a plan day; in single-visitor mode no day has an agent. */
export function agentLabel(agent: string | null, mode: PlanningMode): string {
  if (agent) {
    return agent;
  }
  return mode === 'SINGLE_VISITOR' ? 'Single visitor' : 'No agent';
}

/** Agents that have at least one planned day, sorted by name. */
export function planAgents(days: readonly PlanDay[]): string[] {
  const agents = new Set(days.map((day) => day.agent).filter((agent): agent is string => !!agent));
  return [...agents].sort((a, b) => a.localeCompare(b));
}

// Dates are handled in UTC so that a daylight saving change never moves a day.
function toTime(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function toDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function mondayOf(date: string): number {
  const time = toTime(date);
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return time - sinceMonday * DAY_MS;
}

/**
 * The plan as a calendar: the weeks that have planned days, each from Monday to Friday. `agent` keeps the days of
 * one agent; null keeps every day.
 */
export function calendarWeeks(days: readonly PlanDay[], agent: string | null): CalendarWeek[] {
  const byMonday = new Map<number, PlanDay[]>();
  for (const day of days) {
    if (agent !== null && day.agent !== agent) {
      continue;
    }
    const monday = mondayOf(day.date);
    byMonday.set(monday, [...(byMonday.get(monday) ?? []), day]);
  }
  return [...byMonday.entries()]
    .sort(([a], [b]) => a - b)
    .map(([monday, weekDays]) => ({
      monday: toDate(monday),
      days: Array.from({ length: WEEKDAYS }, (_, offset) => {
        const date = toDate(monday + offset * DAY_MS);
        return { date, entries: weekDays.filter((day) => day.date === date) };
      }),
    }));
}

/** OpenStreetMap directions by car from one point to another (US-30). */
export function directionsUrl(from: GeoPoint, to: GeoPoint): string {
  const route = `${from.latitude},${from.longitude};${to.latitude},${to.longitude}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
}

/** Visits of a day in order, each with the directions from the previous stop. */
export function visitStops(day: PlanDay, base: GeoPoint): VisitStop[] {
  return day.visits.map((visit, index) => ({
    visit,
    directions: directionsUrl(index === 0 ? base : day.visits[index - 1], visit),
  }));
}

/** Excel export of the plan (API_CONTRACT.md endpoint 18): every agent, or only `agent`. */
export function exportUrl(planId: number, agent: string | null): string {
  const url = `/api/plans/${planId}/export`;
  return agent ? `${url}?agent=${encodeURIComponent(agent)}` : url;
}

/** Company forms kept in capitals by {@link readableName}. */
const COMPANY_FORMS = new Set(['SNC', 'SAS', 'SRL', 'SRLS', 'SPA', 'SS', 'SCARL', 'SCRL', 'SAPA', 'COOP']);
/** Italian articles and prepositions written in lower case inside a name ("Via di Porta Maggiore"). */
const PARTICLES = new Set([
  'di', 'da', 'e', 'a', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'del', 'dello', 'della', 'dei', 'degli', 'delle', 'dell',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'all',
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'dall',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'nell',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'sull',
]);

function capitalize(word: string): string {
  const index = word.search(/\p{L}/u);
  return index < 0 ? word : word.slice(0, index) + word[index].toUpperCase() + word.slice(index + 1);
}

/**
 * Names and addresses of the ERP export arrive in capitals: shown as ordinary words ("Ristorante Luna Rossa",
 * "Via di Porta Maggiore 30"), keeping company forms (SNC, S.R.L.) and anything with digits as they are.
 */
export function readableName(text: string): string {
  return text
    .split(/(\s+)/)
    .map((word, index) => {
      const letters = word.replace(/[^\p{L}.]/gu, '');
      if (!letters || /\d/.test(word) || COMPANY_FORMS.has(letters) || /\p{L}\.\p{L}/u.test(letters)) {
        return word;
      }
      const first = index === 0;
      return word
        .toLowerCase()
        .split("'")
        .map((part, position) =>
          position === 0 && !first && PARTICLES.has(part.replace(/[^\p{L}]/gu, '')) ? part : capitalize(part),
        )
        .join("'");
    })
    .join('');
}
