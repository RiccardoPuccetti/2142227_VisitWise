/// <reference lib="es2023.intl" />
// useGrouping: 'always' is typed from ES2023 (the build targets ES2022); every supported browser has it.

/**
 * Numbers are written the Italian way (the data is Italian), dates in English words like the rest of the UI. Italian
 * leaves four-digit numbers ungrouped ("2011"): the formatters group them always, so they match "11.761".
 */
export const LOCALE = 'it-IT';

const PERCENT = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });
const WHOLE_PERCENT = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, useGrouping: 'always' });

// Dates of the API are YYYY-MM-DD: formatted in UTC so the day never moves with the time zone.
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** A share (0.857) as a percentage: "85,7%", or "86%" with `digits` 0. */
export function formatPercent(share: number, digits: 0 | 1 = 1): string {
  return (digits === 0 ? WHOLE_PERCENT : PERCENT).format(share);
}

/** A number with at most one decimal, e.g. km or hours: "610,3". */
export function formatDecimal(value: number): string {
  return DECIMAL.format(value);
}

/** A calendar day of the API as a short title: "Mon 2 Nov". */
export function formatDay(date: string): string {
  return DAY.format(calendarDay(date)).replace(',', '');
}

/** A calendar day of the API: "19 Dec 2026". */
export function formatDate(date: string): string {
  return DATE.format(calendarDay(date));
}

/** An instant of the API (e.g. a creation time) in the browser's time zone: "28 Sept 2026, 10:15". */
export function formatDateTime(instant: string): string {
  return DATE_TIME.format(new Date(instant));
}

function calendarDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
