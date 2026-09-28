import type { CampaignPreset, PlanKpis, PlanSummary } from '../../core/models/api.models';
import {
  KPI_ROWS,
  bestColumns,
  coverageCurve,
  defaultParameters,
  parseHorizons,
} from './scenario-compare.model';

const KPIS: PlanKpis = {
  plannedVisits: 40,
  uniqueCustomers: 36,
  coveredRevenue: 395000,
  eligibleRevenue: 560000,
  coverage: 0.71,
  upperBoundRevenue: 402000,
  totalKm: 420.5,
  travelHours: 21.9,
  workingDaysUsed: 20,
  lastVisitDate: '2026-11-27',
  visitsAfterDeadline: 0,
  excludedOutOfRange: 1,
};

const PRESET: CampaignPreset = {
  code: 'CHRISTMAS',
  label: 'Before Christmas',
  startDate: '2026-11-02',
  endDate: '2026-12-19',
  workingDays: 34,
};

function scenario(id: number, kpis: Partial<PlanKpis>): PlanSummary {
  return {
    id,
    name: `Scenario ${id}`,
    createdAt: '2026-09-28T10:00:00Z',
    parameters: defaultParameters(PRESET, { latitude: 41.9, longitude: 12.5 }, [21]),
    kpis: { ...KPIS, ...kpis },
  };
}

describe('parseHorizons', () => {
  it('accepts up to five distinct horizons, sorted', () => {
    expect(parseHorizons('40, 20 30')).toEqual({ horizons: [20, 30, 40] });
    expect(parseHorizons('20;20,40')).toEqual({ horizons: [20, 40] });
  });

  it('rejects empty input, non-integers, out-of-range values and more than five horizons', () => {
    expect(parseHorizons('')).toEqual({ error: 'Enter between 1 and 5 horizons in working days.' });
    expect(parseHorizons('1,2,3,4,5,6')).toEqual({
      error: 'Enter between 1 and 5 horizons in working days.',
    });
    expect(parseHorizons('20, abc')).toEqual({
      error: 'Horizons must be whole numbers between 1 and 260 working days.',
    });
    expect(parseHorizons('0, 300')).toEqual({
      error: 'Horizons must be whole numbers between 1 and 260 working days.',
    });
  });
});

describe('defaultParameters', () => {
  it('builds the planner defaults for a campaign with every enterprise weighted 1', () => {
    const parameters = defaultParameters(PRESET, { latitude: 41.9, longitude: 12.5 }, [21, 23]);
    expect(parameters).toMatchObject({
      campaign: 'CHRISTMAS',
      startDate: '2026-11-02',
      deadline: '2026-12-19',
      workingDays: 20,
      enterpriseWeights: [
        { enterpriseId: 21, weight: 1 },
        { enterpriseId: 23, weight: 1 },
      ],
      agents: [],
      planningMode: 'PER_AGENT',
      base: { latitude: 41.9, longitude: 12.5 },
    });
  });
});

describe('coverageCurve', () => {
  it('maps horizons to x and coverage to y inside the chart box', () => {
    const points = coverageCurve(
      [
        { workingDays: 20, kpis: { ...KPIS, coverage: 0.5 }, marginalRevenue: 1 },
        { workingDays: 40, kpis: { ...KPIS, coverage: 1 }, marginalRevenue: 1 },
      ],
      { width: 100, height: 50 },
    );
    expect(points).toEqual([
      { x: 0, y: 25, workingDays: 20, coverage: 0.5 },
      { x: 100, y: 0, workingDays: 40, coverage: 1 },
    ]);
  });

  it('centres a single horizon', () => {
    const [point] = coverageCurve([{ workingDays: 20, kpis: KPIS, marginalRevenue: 0 }], {
      width: 100,
      height: 50,
    });
    expect(point.x).toBe(50);
  });
});

describe('bestColumns', () => {
  it('marks the best scenario for each KPI row, ties included', () => {
    const scenarios = [
      scenario(1, { coveredRevenue: 100, totalKm: 50, plannedVisits: 10 }),
      scenario(2, { coveredRevenue: 200, totalKm: 80, plannedVisits: 10 }),
    ];
    const best = bestColumns(scenarios);
    expect(best['coveredRevenue']).toEqual([1]);
    expect(best['totalKm']).toEqual([0]);
    expect(best['plannedVisits']).toEqual([0, 1]);
  });

  it('marks nothing when there is a single scenario', () => {
    expect(bestColumns([scenario(1, {})])).toEqual({});
  });

  it('has a row for the indicators shown side by side', () => {
    expect(KPI_ROWS.map((row) => row.key)).toContain('coveredRevenue');
    expect(KPI_ROWS.map((row) => row.key)).toContain('totalKm');
  });
});
