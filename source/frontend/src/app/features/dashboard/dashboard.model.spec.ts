import type { DeliveryPoint, EnterpriseAmount, ParetoPoint } from '../../core/models/api.models';
import {
  EMPTY_FILTER,
  filterFromParams,
  filterOptions,
  filterPoints,
  filterToParams,
  markerRadius,
  MAX_MARKER_RADIUS,
  MIN_MARKER_RADIUS,
  pointRevenue,
  shareOfTopFraction,
  toMarkers,
} from './dashboard.model';

function point(
  id: number,
  revenues: [number, number][],
  extra: Partial<DeliveryPoint> = {},
): DeliveryPoint {
  return {
    id,
    sourceRow: id + 1,
    customerName: `CUSTOMER ${id}`,
    pointName: `POINT ${id}`,
    address: `VIA DEL CORSO ${id}`,
    city: 'ROMA',
    agent: 'AGENT NORTH',
    latitude: 41.9,
    longitude: 12.5,
    geocodeStatus: 'OK',
    totalRevenue: revenues.reduce((sum, [, amount]) => sum + amount, 0),
    revenues: revenues.map(([enterpriseId, amount]) => ({ enterpriseId, amount })),
    ...extra,
  };
}

const ENTERPRISES: EnterpriseAmount[] = [
  { enterpriseId: 21, name: 'ENTERPRISE A', color: '#2563eb', revenue: 0, pointCount: 0 },
  { enterpriseId: 22, name: 'ENTERPRISE B', color: '#dc2626', revenue: 0, pointCount: 0 },
];

const POINTS: DeliveryPoint[] = [
  point(1, [
    [21, 1000],
    [22, 3000],
  ]),
  point(2, [[21, 400]], { agent: 'AGENT SOUTH', city: 'TIVOLI' }),
  point(3, [[22, 90]], { agent: null }),
  point(4, [[21, 250]], { latitude: null, longitude: null, geocodeStatus: 'NOT_FOUND' }),
];

describe('pointRevenue', () => {
  it('sums every enterprise when none is selected', () => {
    expect(pointRevenue(POINTS[0], [])).toBe(4000);
  });

  it('sums only the selected enterprises', () => {
    expect(pointRevenue(POINTS[0], [21])).toBe(1000);
    expect(pointRevenue(POINTS[1], [22])).toBe(0);
  });
});

describe('filterPoints', () => {
  const ids = (points: DeliveryPoint[]) => points.map((p) => p.id);

  it('keeps every point with the empty filter', () => {
    expect(ids(filterPoints(POINTS, EMPTY_FILTER))).toEqual([1, 2, 3, 4]);
  });

  it('keeps the points with revenue in the selected enterprises', () => {
    expect(ids(filterPoints(POINTS, { ...EMPTY_FILTER, enterpriseIds: [22] }))).toEqual([1, 3]);
  });

  it('combines agent, city and minimum revenue on the selected enterprises', () => {
    expect(ids(filterPoints(POINTS, { ...EMPTY_FILTER, agent: 'AGENT SOUTH' }))).toEqual([2]);
    expect(ids(filterPoints(POINTS, { ...EMPTY_FILTER, city: 'ROMA' }))).toEqual([1, 3, 4]);
    expect(ids(filterPoints(POINTS, { ...EMPTY_FILTER, minRevenue: 300 }))).toEqual([1, 2]);
    expect(
      ids(
        filterPoints(POINTS, {
          enterpriseIds: [21],
          agent: 'AGENT NORTH',
          city: 'ROMA',
          minRevenue: 300,
        }),
      ),
    ).toEqual([1]);
  });
});

describe('filterOptions', () => {
  it('lists agents and cities once, sorted, without empty agents', () => {
    expect(filterOptions(POINTS)).toEqual({
      agents: ['AGENT NORTH', 'AGENT SOUTH'],
      cities: ['ROMA', 'TIVOLI'],
    });
  });
});

describe('markerRadius', () => {
  it('makes the marker area proportional to revenue', () => {
    expect(markerRadius(1000, 1000)).toBe(MAX_MARKER_RADIUS);
    expect(markerRadius(250, 1000)).toBeCloseTo(MAX_MARKER_RADIUS / 2, 6);
  });

  it('never goes below the minimum visible size', () => {
    expect(markerRadius(1, 1_000_000)).toBe(MIN_MARKER_RADIUS);
    expect(markerRadius(-50, 1000)).toBe(MIN_MARKER_RADIUS);
    expect(markerRadius(0, 0)).toBe(MIN_MARKER_RADIUS);
  });
});

describe('toMarkers', () => {
  it('places only geolocated points, colored by their largest selected enterprise', () => {
    const markers = toMarkers(POINTS, ENTERPRISES, EMPTY_FILTER);

    expect(markers.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(markers[0].color).toBe('#dc2626');
    expect(markers[1].color).toBe('#2563eb');
    expect(markers[0].radius).toBe(MAX_MARKER_RADIUS);
    expect(markers[0].title).toContain('POINT 1');
  });

  it('sizes and colors on the selected enterprises only', () => {
    const markers = toMarkers(POINTS, ENTERPRISES, { ...EMPTY_FILTER, enterpriseIds: [21] });

    expect(markers.map((m) => m.id)).toEqual([1, 2]);
    expect(markers[0].color).toBe('#2563eb');
    expect(markers[1].radius).toBeCloseTo(MAX_MARKER_RADIUS * Math.sqrt(400 / 1000), 6);
  });
});

describe('URL query string', () => {
  it('writes only the filters that are set', () => {
    expect(filterToParams(EMPTY_FILTER)).toEqual({
      enterprise: null,
      agent: null,
      city: null,
      minRevenue: null,
    });
    expect(
      filterToParams({
        enterpriseIds: [21, 22],
        agent: 'AGENT NORTH',
        city: 'ROMA',
        minRevenue: 500,
      }),
    ).toEqual({ enterprise: '21,22', agent: 'AGENT NORTH', city: 'ROMA', minRevenue: '500' });
  });

  it('reads back what it writes and ignores invalid values', () => {
    const filter = { enterpriseIds: [21, 22], agent: 'AGENT NORTH', city: 'ROMA', minRevenue: 500 };
    const params = filterToParams(filter);
    expect(filterFromParams((key) => params[key as keyof typeof params])).toEqual(filter);

    const junk: Record<string, string> = { enterprise: '21,abc,', minRevenue: '-3' };
    expect(filterFromParams((key) => junk[key] ?? null)).toEqual({
      ...EMPTY_FILTER,
      enterpriseIds: [21],
    });
  });
});

describe('shareOfTopFraction', () => {
  const pareto: ParetoPoint[] = [
    { points: 1, revenueShare: 0.5 },
    { points: 2, revenueShare: 0.75 },
    { points: 3, revenueShare: 0.9 },
    { points: 4, revenueShare: 0.97 },
    { points: 5, revenueShare: 1 },
  ];

  it('reads the share held by the top fraction of points, rounding the count up', () => {
    expect(shareOfTopFraction(pareto, 0.2)).toBe(0.5);
    expect(shareOfTopFraction(pareto, 0.5)).toBe(0.9);
  });

  it('is null without points', () => {
    expect(shareOfTopFraction([], 0.2)).toBeNull();
  });
});
