import type {
  GeoPoint,
  PlanParameters,
  PlanResult,
  RouteResponse,
} from '../../core/models/api.models';
import type { MapMarker, MapRoute } from '../../shared';

export const DEFAULT_BASE = { latitude: 41.896, longitude: 12.4823 } as const;
export const BASE_MARKER_ID = 'base';
const ROUTE_COLOR = '#2563eb';
const BASE_COLOR = '#dc2626';

/** Client-side feedback mirroring the planning API validation rules. */
export function validateParameters(parameters: PlanParameters): string[] {
  const errors: string[] = [];
  if (parameters.workingDays < 1 || parameters.workingDays > 260) {
    errors.push('Working days must be between 1 and 260.');
  }
  if (parameters.visitDurationMinutes < 30 || parameters.visitDurationMinutes > 480) {
    errors.push('Visit duration must be between 30 and 480 minutes.');
  }
  if (parameters.workdayMinutes < parameters.visitDurationMinutes) {
    errors.push('The workday must be at least as long as one visit.');
  }
  if (parameters.enterpriseWeights.some((item) => item.weight < 0)) {
    errors.push('Enterprise weights cannot be negative.');
  }
  if (parameters.averageSpeedKmh <= 0) {
    errors.push('Average speed must be greater than zero.');
  }
  if (parameters.roadFactor < 1) {
    errors.push('Road factor must be at least 1.');
  }
  if (parameters.maxDistanceKm <= 0) {
    errors.push('Maximum distance must be greater than zero.');
  }
  if (!parameters.startDate) {
    errors.push('Choose a start date.');
  }
  return errors;
}

/** The starting base (red) plus the numbered stops of the selected day. */
export function planMarkers(result: PlanResult | null, dayIndex: number): MapMarker[] {
  const day = result?.days[dayIndex];
  if (!result || !day) {
    return [];
  }
  return [
    {
      id: BASE_MARKER_ID,
      latitude: result.parameters.base.latitude,
      longitude: result.parameters.base.longitude,
      color: BASE_COLOR,
      radius: 8,
      title: 'Starting base',
    },
    ...day.visits.map((visit) => ({
      id: visit.deliveryPointId,
      latitude: visit.latitude,
      longitude: visit.longitude,
      color: ROUTE_COLOR,
      radius: 7,
      title: `${visit.slot}. ${visit.pointName}`,
    })),
  ];
}

/** Marker for the base alone, shown before a plan exists so the user can check the address on the map. */
export function baseMarker(base: GeoPoint | null): MapMarker[] {
  return base
    ? [
        {
          id: BASE_MARKER_ID,
          latitude: base.latitude,
          longitude: base.longitude,
          color: BASE_COLOR,
          radius: 8,
          title: 'Starting base',
        },
      ]
    : [];
}

/**
 * The polyline of the selected day: the real road geometry when the routing service answered for this day,
 * otherwise straight segments base → stops → base.
 */
export function planRoutes(
  result: PlanResult | null,
  dayIndex: number,
  road: RouteResponse | null = null,
): MapRoute[] {
  const day = result?.days[dayIndex];
  if (!result || !day) {
    return [];
  }
  const points =
    road && road.geometry.length >= 2
      ? road.geometry
      : [
          result.parameters.base,
          ...day.visits.map(({ latitude, longitude }) => ({ latitude, longitude })),
          result.parameters.base,
        ];
  return [{ id: `${day.date}-${day.agent ?? 'single'}`, color: ROUTE_COLOR, points }];
}
