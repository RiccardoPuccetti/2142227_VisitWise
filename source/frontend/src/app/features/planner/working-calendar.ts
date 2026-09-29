/**
 * The planner engine's calendar (backend `WorkingCalendar`): Monday to Friday, without the Italian and Rome
 * public holidays and Easter Monday. Keep the two in step.
 */
const FIXED_HOLIDAYS = new Set(['01-01', '01-06', '04-25', '05-01', '06-02', '06-29', '08-15', '11-01', '12-08', '12-25', '12-26']);
const DAY_MS = 86_400_000;

/** Working days from `start` to `end` (ISO dates, both included), or null when a date is missing or invalid. */
export function workingDaysBetween(start: string, end: string): number | null {
  const from = parseDate(start);
  const to = parseDate(end);
  if (from === null || to === null) {
    return null;
  }
  let days = 0;
  for (let time = from; time <= to; time += DAY_MS) {
    if (isWorkingDay(new Date(time))) {
      days++;
    }
  }
  return days;
}

function isWorkingDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  const monthDay = date.toISOString().slice(5, 10);
  return weekday !== 0 && weekday !== 6 && !FIXED_HOLIDAYS.has(monthDay) && date.getTime() !== easterMonday(date.getUTCFullYear());
}

/** Gregorian computus, as in the engine. */
function easterMonday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day) + DAY_MS;
}

function parseDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(time).toISOString().startsWith(value) ? time : null;
}
