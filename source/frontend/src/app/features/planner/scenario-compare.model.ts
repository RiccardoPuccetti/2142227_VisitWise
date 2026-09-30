import type {
  CampaignPreset,
  GeoPoint,
  PlanKpis,
  PlanParameters,
  PlanSummary,
  WhatIfRow,
} from '../../core/models/api.models';
import { MAX_WORKING_DAYS } from './planner.model';
import { workingDaysBetween } from './working-calendar';

/** The planning API takes 1 to 5 distinct horizons (US-26). */
export const MAX_HORIZONS = 5;

/**
 * Last day of the horizons track: the working days of the plan's window (a horizon beyond the deadline adds nothing),
 * or the API limit when the plan has no deadline. At least 1, so there is always a day to pick.
 */
export function horizonTrackMax(parameters: Pick<PlanParameters, 'startDate' | 'deadline'>): number {
  if (!parameters.deadline) {
    return MAX_WORKING_DAYS;
  }
  const days = workingDaysBetween(parameters.startDate, parameters.deadline) ?? MAX_WORKING_DAYS;
  return Math.min(MAX_WORKING_DAYS, Math.max(1, days));
}

/** A third, two thirds and the whole of the track (fewer on a very short track). */
export function defaultHorizons(max: number): number[] {
  return [...new Set([Math.round(max / 3), Math.round((max * 2) / 3), max])].filter((value) => value >= 1);
}

/** One more horizon in the middle of the widest gap (from day 0), while there are fewer than 5 and there is room. */
export function addHorizon(horizons: readonly number[], max: number): number[] {
  const sorted = [...horizons].sort((a, b) => a - b);
  if (sorted.length >= MAX_HORIZONS) {
    return sorted;
  }
  const bounds = [0, ...sorted];
  let from = 0;
  let to = 0;
  for (let i = 1; i < bounds.length; i++) {
    if (bounds[i] - bounds[i - 1] > to - from) {
      from = bounds[i - 1];
      to = bounds[i];
    }
  }
  const middle = Math.round((from + to) / 2);
  return middle > from && middle < to && middle <= max ? [...sorted, middle].sort((a, b) => a - b) : sorted;
}

/** The planner form defaults for a campaign: every enterprise weighted 1, all agents, per-agent plan. */
export function defaultParameters(
  preset: CampaignPreset,
  base: GeoPoint,
  enterpriseIds: number[],
): PlanParameters {
  return {
    campaign: preset.code,
    startDate: preset.startDate,
    deadline: preset.endDate,
    workingDays: 20,
    enterpriseWeights: enterpriseIds.map((enterpriseId) => ({ enterpriseId, weight: 1 })),
    agents: [],
    planningMode: 'PER_AGENT',
    visitDurationMinutes: 210,
    workdayMinutes: 480,
    averageSpeedKmh: 25,
    roadFactor: 1.3,
    maxDistanceKm: 80,
    base: { latitude: base.latitude, longitude: base.longitude },
    travelCostPerKm: 2,
    minRevenue: 0,
  };
}

export interface CurvePoint {
  x: number;
  y: number;
  workingDays: number;
  coverage: number;
}

/**
 * Coverage curve for an inline SVG: x spreads the horizons over the width (a single horizon is centred),
 * y is the coverage from 0 (bottom) to 1 (top).
 */
export function coverageCurve(
  rows: WhatIfRow[],
  box: { width: number; height: number },
): CurvePoint[] {
  if (rows.length === 0) {
    return [];
  }
  const days = rows.map((row) => row.workingDays);
  const min = Math.min(...days);
  const span = Math.max(...days) - min;
  return rows.map((row) => {
    const coverage = Math.min(1, Math.max(0, row.kpis.coverage));
    return {
      x: span === 0 ? box.width / 2 : ((row.workingDays - min) / span) * box.width,
      y: (1 - coverage) * box.height,
      workingDays: row.workingDays,
      coverage,
    };
  });
}

export interface KpiRow {
  key: keyof PlanKpis;
  label: string;
  /** Whether a higher or a lower value is the better one when comparing scenarios. */
  better: 'higher' | 'lower';
  format: 'eur' | 'percent' | 'integer' | 'km' | 'hours';
}

/** Indicators shown side by side, in display order. */
export const KPI_ROWS: readonly KpiRow[] = [
  { key: 'coveredRevenue', label: 'Covered revenue', better: 'higher', format: 'eur' },
  { key: 'coverage', label: 'Coverage of eligible revenue', better: 'higher', format: 'percent' },
  { key: 'plannedVisits', label: 'Visits', better: 'higher', format: 'integer' },
  { key: 'uniqueCustomers', label: 'Customers reached', better: 'higher', format: 'integer' },
  { key: 'workingDaysUsed', label: 'Working days used', better: 'lower', format: 'integer' },
  { key: 'totalKm', label: 'Distance', better: 'lower', format: 'km' },
  { key: 'travelHours', label: 'Time on the road', better: 'lower', format: 'hours' },
];

/**
 * For every KPI row, the column indexes of the scenarios with the best value (ties share the mark).
 * Empty with fewer than two scenarios: there is nothing to compare.
 */
export function bestColumns(scenarios: PlanSummary[]): Partial<Record<keyof PlanKpis, number[]>> {
  const result: Partial<Record<keyof PlanKpis, number[]>> = {};
  if (scenarios.length < 2) {
    return result;
  }
  for (const row of KPI_ROWS) {
    const values = scenarios.map((scenario) => Number(scenario.kpis[row.key]));
    const best = row.better === 'higher' ? Math.max(...values) : Math.min(...values);
    result[row.key] = values.flatMap((value, index) => (value === best ? [index] : []));
  }
  return result;
}
