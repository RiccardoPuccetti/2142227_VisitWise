import type { PlanDay, PlanParameters, PlanResult, PlannedVisit } from '../../core/models/api.models';
import {
  dayRevenue,
  dayTitle,
  groupDays,
  planRoutes,
  revealDelay,
  travelBasis,
  validateParameters,
} from './planner.model';

const PARAMETERS: PlanParameters = {
  campaign: 'CHRISTMAS',
  startDate: '2026-11-02',
  deadline: '2026-12-19',
  workingDays: 20,
  enterpriseWeights: [{ enterpriseId: 21, weight: 1 }],
  agents: [],
  planningMode: 'PER_AGENT',
  visitDurationMinutes: 210,
  workdayMinutes: 480,
  averageSpeedKmh: 25,
  roadFactor: 1.3,
  maxDistanceKm: 80,
  base: { latitude: 41.896, longitude: 12.4823 },
  travelCostPerKm: 2,
  minRevenue: 0,
};

describe('planner model', () => {
  it('rejects invalid day capacity and enterprise weights', () => {
    expect(validateParameters({ ...PARAMETERS, workingDays: 0 })).toContain(
      'Working days must be between 1 and 260.',
    );
    expect(
      validateParameters({
        ...PARAMETERS,
        enterpriseWeights: [{ enterpriseId: 21, weight: -1 }],
      }),
    ).toContain('Enterprise weights cannot be negative.');
    expect(
      validateParameters({ ...PARAMETERS, visitDurationMinutes: 300, workdayMinutes: 240 }),
    ).toContain('The workday must be at least as long as one visit.');
  });

  it('draws the selected itinerary from the base and back', () => {
    const result = {
      parameters: PARAMETERS,
      days: [
        {
          date: '2026-11-02',
          agent: 'AGENT NORTH',
          km: 12,
          visits: [
            { deliveryPointId: 1, latitude: 41.9, longitude: 12.5 },
            { deliveryPointId: 2, latitude: 41.91, longitude: 12.52 },
          ],
        },
      ],
    } as PlanResult;

    expect(planRoutes(result, 0)[0].points).toEqual([
      PARAMETERS.base,
      { latitude: 41.9, longitude: 12.5 },
      { latitude: 41.91, longitude: 12.52 },
      PARAMETERS.base,
    ]);
  });
});

describe('travelBasis', () => {
  it('names the road network only when the plan was measured on it', () => {
    expect(travelBasis('OSRM')).toBe('road network');
    expect(travelBasis('ESTIMATE')).toBe('estimate');
    expect(travelBasis(null)).toBe('estimate');
    expect(travelBasis(undefined)).toBe('estimate');
  });
});

describe('days of the plan', () => {
  it('titles a day with the weekday, the day and the month', () => {
    expect(dayTitle('2026-11-02')).toBe('Mon 2 Nov');
    expect(dayTitle('2026-12-18')).toBe('Fri 18 Dec');
  });

  it('adds up the revenue expected from the visits of a day', () => {
    const visit = (expectedRevenue: number) => ({ expectedRevenue }) as PlannedVisit;
    const day: PlanDay = { date: '2026-11-02', agent: null, km: 12, visits: [visit(1200.5), visit(300)] };
    expect(dayRevenue(day)).toBe(1500.5);
    expect(dayRevenue({ ...day, visits: [] })).toBe(0);
  });
});

describe('revealDelay', () => {
  it('waits for what is left of the minimum loading time, never less than zero', () => {
    expect(revealDelay(1000, 1300, 900)).toBe(600);
    expect(revealDelay(1000, 2500, 900)).toBe(0);
    expect(revealDelay(1000, 1000, 0)).toBe(0);
  });
});

describe('groupDays', () => {
  const visit = (expectedRevenue: number) => ({ expectedRevenue }) as PlannedVisit;
  const day = (date: string, agent: string | null, revenues: number[], km = 10): PlanDay => ({
    date,
    agent,
    km,
    visits: revenues.map(visit),
  });

  it('groups the routes by date, with the total of each day', () => {
    const groups = groupDays([
      day('2026-11-02', 'AGENT EAST', [300]),
      day('2026-11-02', 'AGENT NORTH', [100, 100]),
      day('2026-11-03', 'AGENT EAST', [150]),
    ]);

    expect(groups.map((group) => [group.title, group.routes.length, group.revenue])).toEqual([
      ['Mon 2 Nov', 2, 500],
      ['Tue 3 Nov', 1, 150],
    ]);
    // Each route keeps the position of its day in the plan, to select it.
    expect(groups[1].routes[0].index).toBe(2);
    expect(groups[0].routes[1]).toMatchObject({ agent: 'AGENT NORTH', stops: 2, km: 10, revenue: 200 });
  });

  it('gives every agent its own color, the same on every day, and one visitor a single color', () => {
    const groups = groupDays([
      day('2026-11-02', 'AGENT EAST', [1]),
      day('2026-11-02', 'AGENT NORTH', [1]),
      day('2026-11-03', 'AGENT EAST', [1]),
    ]);
    const [east, north] = groups[0].routes;
    expect(east.color).not.toBe(north.color);
    expect(groups[1].routes[0].color).toBe(east.color);

    const alone = groupDays([day('2026-11-02', null, [1])])[0].routes[0];
    expect(alone.agent).toBe('One visitor');
  });

  it('measures each route against the most valuable route of the plan', () => {
    const [group] = groupDays([day('2026-11-02', 'A', [400]), day('2026-11-02', 'B', [100])]);
    expect(group.routes.map((route) => route.share)).toEqual([1, 0.25]);
  });
});
