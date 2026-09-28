import type {
  CampaignPreset,
  GeoPoint,
  PlanKpis,
  PlanParameters,
  PlanSummary,
  WhatIfRow,
} from '../../core/models/api.models';

const MAX_HORIZONS = 5;
const MAX_WORKING_DAYS = 260;

/** Mirrors the what-if rules of the planning API: 1 to 5 distinct horizons, each 1..260 working days. */
export function parseHorizons(text: string): { horizons: number[] } | { error: string } {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.length > MAX_HORIZONS) {
    return { error: `Enter between 1 and ${MAX_HORIZONS} horizons in working days.` };
  }
  const values = tokens.map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > MAX_WORKING_DAYS)) {
    return {
      error: `Horizons must be whole numbers between 1 and ${MAX_WORKING_DAYS} working days.`,
    };
  }
  return { horizons: [...new Set(values)].sort((a, b) => a - b) };
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
