import type { PlanParameters, PlanResult } from '../../core/models/api.models';
import type { MapMarker, MapRoute } from '../../shared';

export const DEFAULT_BASE = { latitude: 41.896, longitude: 12.4823 } as const;

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

export function planMarkers(result: PlanResult | null, dayIndex: number): MapMarker[] {
  const day = result?.days[dayIndex];
  if (!day) {
    return [];
  }
  return day.visits.map((visit) => ({
    id: visit.deliveryPointId,
    latitude: visit.latitude,
    longitude: visit.longitude,
    color: '#2563eb',
    radius: 7,
    title: `${visit.slot}. ${visit.pointName}`,
  }));
}

export function planRoutes(result: PlanResult | null, dayIndex: number): MapRoute[] {
  const day = result?.days[dayIndex];
  if (!result || !day) {
    return [];
  }
  return [
    {
      id: `${day.date}-${day.agent ?? 'single'}`,
      color: '#2563eb',
      points: [
        result.parameters.base,
        ...day.visits.map(({ latitude, longitude }) => ({ latitude, longitude })),
        result.parameters.base,
      ],
    },
  ];
}
