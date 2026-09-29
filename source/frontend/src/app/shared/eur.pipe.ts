/// <reference lib="es2023.intl" />
import { Pipe, PipeTransform } from '@angular/core';
import { LOCALE } from './format';

const FULL = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

const ROUNDED = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

const COMPACT = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export type EurFormat = 'full' | 'rounded' | 'compact';

/**
 * Formats an amount in EUR.
 *
 * - `full` (default): 2 decimals, for tables and popups.
 * - `rounded`: no decimals, for KPI values.
 * - `compact`: short form (e.g. "1,2 Mln €"), for chart labels and tight spaces.
 *
 * `null` / `undefined` / `NaN` render as an en dash, so a missing value is never shown as 0.
 *
 * Usage: `{{ point.totalRevenue | eur }}`, `{{ kpis.coveredRevenue | eur: 'rounded' }}`.
 */
@Pipe({ name: 'eur' })
export class EurPipe implements PipeTransform {
  transform(value: number | null | undefined, format: EurFormat = 'full'): string {
    return formatEur(value, format);
  }
}

/** Same formatting as the `eur` pipe, for use in TypeScript (e.g. map labels). */
export function formatEur(value: number | null | undefined, format: EurFormat = 'full'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–';
  }
  switch (format) {
    case 'rounded':
      return ROUNDED.format(value);
    case 'compact':
      return COMPACT.format(value);
    default:
      return FULL.format(value);
  }
}
