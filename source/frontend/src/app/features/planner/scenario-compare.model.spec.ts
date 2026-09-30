import type { CampaignPreset, PlanKpis, PlanSummary } from '../../core/models/api.models';
import {
  KPI_ROWS,
  bestColumns,
  coverageCurve,
  addHorizon,
  defaultHorizons,
  defaultParameters,
  formatKpi,
  horizonTrackMax,
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

describe('horizons track', () => {
  const christmas = { startDate: '2026-11-02', deadline: '2026-12-19' };

  it('runs over the working days of the plan window, or up to the API limit without a deadline', () => {
    expect(horizonTrackMax(christmas)).toBe(34);
    expect(horizonTrackMax({ startDate: '2026-11-02', deadline: null })).toBe(260);
    // A window without working days still leaves one day to pick.
    expect(horizonTrackMax({ startDate: '2026-12-25', deadline: '2026-12-25' })).toBe(1);
  });

  it('starts from a third, two thirds and the whole of the track', () => {
    expect(defaultHorizons(34)).toEqual([11, 23, 34]);
    expect(defaultHorizons(2)).toEqual([1, 2]);
    expect(defaultHorizons(1)).toEqual([1]);
  });

  it('adds a horizon in the middle of the widest gap, up to five', () => {
    expect(addHorizon([11, 23, 34], 34)).toEqual([11, 17, 23, 34]);
    expect(addHorizon([34], 34)).toEqual([17, 34]);
    expect(addHorizon([5, 10, 15, 20, 25], 34)).toEqual([5, 10, 15, 20, 25]);
    // No room left on a one-day track.
    expect(addHorizon([1], 1)).toEqual([1]);
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

describe('formatKpi', () => {
  it('writes each indicator in its unit', () => {
    const value = (key: string) => formatKpi(KPI_ROWS.find((row) => row.key === key)!, KPIS);
    expect(value('coveredRevenue')).toBe('395.000 €');
    expect(value('coverage')).toBe('71%');
    expect(value('plannedVisits')).toBe('40');
    expect(value('totalKm')).toBe('420,5 km');
    expect(value('travelHours')).toBe('21,9 h');
  });
});
