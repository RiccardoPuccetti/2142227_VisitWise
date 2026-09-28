import type { DeliveryPoint, EnterpriseAmount, ParetoPoint } from '../../core/models/api.models';
import { formatEur, type MapMarker } from '../../shared';

/** Smallest marker radius in pixels, so that small customers stay visible and clickable. */
export const MIN_MARKER_RADIUS = 3;
/** Radius of the point with the largest revenue. */
export const MAX_MARKER_RADIUS = 18;
/** Color of a marker whose enterprise has no color. */
const FALLBACK_COLOR = '#6b7280';

/** Filters of the map dashboard (US-14, US-15). Empty values mean "all". */
export interface DashboardFilter {
  enterpriseIds: number[];
  agent: string | null;
  city: string | null;
  minRevenue: number;
}

export const EMPTY_FILTER: DashboardFilter = {
  enterpriseIds: [],
  agent: null,
  city: null,
  minRevenue: 0,
};

export type FilterParams = Record<'enterprise' | 'agent' | 'city' | 'minRevenue', string | null>;

function inSelection(enterpriseId: number, enterpriseIds: readonly number[]): boolean {
  return enterpriseIds.length === 0 || enterpriseIds.includes(enterpriseId);
}

/** Revenue of a point for the selected enterprises (all of them when none is selected). */
export function pointRevenue(point: DeliveryPoint, enterpriseIds: readonly number[]): number {
  return point.revenues
    .filter((line) => inSelection(line.enterpriseId, enterpriseIds))
    .reduce((sum, line) => sum + line.amount, 0);
}

/**
 * Points that match every filter: some revenue in the selected enterprises, same agent, same city, and revenue of
 * the selected enterprises at least `minRevenue`.
 */
export function filterPoints(
  points: readonly DeliveryPoint[],
  filter: DashboardFilter,
): DeliveryPoint[] {
  return points.filter(
    (point) =>
      (filter.enterpriseIds.length === 0 ||
        point.revenues.some((line) => filter.enterpriseIds.includes(line.enterpriseId))) &&
      (filter.agent === null || point.agent === filter.agent) &&
      (filter.city === null || point.city === filter.city) &&
      (filter.minRevenue <= 0 || pointRevenue(point, filter.enterpriseIds) >= filter.minRevenue),
  );
}

/** Values offered by the agent and city filters. */
export function filterOptions(points: readonly DeliveryPoint[]): {
  agents: string[];
  cities: string[];
} {
  const sorted = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => !!value))].sort((a, b) =>
      a.localeCompare(b),
    );
  return { agents: sorted(points.map((p) => p.agent)), cities: sorted(points.map((p) => p.city)) };
}

/** Radius such that the marker area is proportional to revenue (US-16), never below the minimum. */
export function markerRadius(revenue: number, maxRevenue: number): number {
  if (revenue <= 0 || maxRevenue <= 0) {
    return MIN_MARKER_RADIUS;
  }
  return Math.max(MIN_MARKER_RADIUS, MAX_MARKER_RADIUS * Math.sqrt(revenue / maxRevenue));
}

/** The selected enterprise with the largest revenue at this point: it gives the marker its color. */
function mainEnterpriseId(point: DeliveryPoint, enterpriseIds: readonly number[]): number | null {
  let best: { enterpriseId: number; amount: number } | null = null;
  for (const line of point.revenues) {
    if (
      inSelection(line.enterpriseId, enterpriseIds) &&
      (best === null || line.amount > best.amount)
    ) {
      best = line;
    }
  }
  return best?.enterpriseId ?? null;
}

/** Markers of the filtered, geolocated points: color of the main enterprise, area proportional to revenue. */
export function toMarkers(
  points: readonly DeliveryPoint[],
  enterprises: readonly EnterpriseAmount[],
  filter: DashboardFilter,
): MapMarker[] {
  const colors = new Map(enterprises.map((e) => [e.enterpriseId, e.color]));
  const placed = filterPoints(points, filter).filter(
    (p) => p.latitude !== null && p.longitude !== null,
  );
  const revenues = placed.map((p) => pointRevenue(p, filter.enterpriseIds));
  const max = Math.max(0, ...revenues);
  return placed.map((point, i) => {
    const main = mainEnterpriseId(point, filter.enterpriseIds);
    return {
      id: point.id,
      latitude: point.latitude as number,
      longitude: point.longitude as number,
      color: (main !== null && colors.get(main)) || FALLBACK_COLOR,
      radius: markerRadius(revenues[i], max),
      title: `${point.pointName} – ${formatEur(revenues[i], 'rounded')}`,
    };
  });
}

/** Query string of the filters (US-15): unset filters are removed from the URL. */
export function filterToParams(filter: DashboardFilter): FilterParams {
  return {
    enterprise: filter.enterpriseIds.length ? filter.enterpriseIds.join(',') : null,
    agent: filter.agent,
    city: filter.city,
    minRevenue: filter.minRevenue > 0 ? String(filter.minRevenue) : null,
  };
}

/** Filters from the query string; invalid values are ignored. */
export function filterFromParams(get: (key: string) => string | null | undefined): DashboardFilter {
  const enterpriseIds = (get('enterprise') ?? '')
    .split(',')
    .filter((part) => /^\d+$/.test(part))
    .map(Number);
  const minRevenue = Number(get('minRevenue'));
  return {
    enterpriseIds,
    agent: get('agent') || null,
    city: get('city') || null,
    minRevenue: Number.isFinite(minRevenue) && minRevenue > 0 ? minRevenue : 0,
  };
}

/**
 * Share of revenue held by the largest `fraction` of points (e.g. 0.2 = top 20%), reading the Pareto curve of the
 * summary. The number of points is rounded up, so the answer always covers at least one point.
 */
export function shareOfTopFraction(
  pareto: readonly ParetoPoint[],
  fraction: number,
): number | null {
  if (pareto.length === 0) {
    return null;
  }
  // The epsilon keeps 0.3 * 10 (= 3.0000000000000004 in floating point) at 3 points.
  const count = Math.min(pareto.length, Math.max(1, Math.ceil(pareto.length * fraction - 1e-9)));
  return pareto[count - 1].revenueShare;
}
