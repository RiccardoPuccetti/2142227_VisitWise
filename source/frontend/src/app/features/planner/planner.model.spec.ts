import type { PlanParameters, PlanResult } from '../../core/models/api.models';
import { planRoutes, travelBasis, validateParameters } from './planner.model';

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
