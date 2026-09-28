import type {
  GeoPoint,
  PlanDay,
  PlanParameters,
  PlanResult,
  RouteResponse,
  RouteSource,
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

/** How the km and hours of a plan were obtained, for the label next to them (US-39). */
export function travelBasis(source: RouteSource | null | undefined): string {
  return source === 'OSRM' ? 'road network' : 'estimate';
}

const DAY_TITLE = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Short title of a plan day, e.g. "Mon 2 Nov" (the date is a calendar day, read as UTC). */
export function dayTitle(date: string): string {
  return DAY_TITLE.format(new Date(`${date}T00:00:00Z`)).replace(',', '');
}

/** Revenue expected from the visits of a day. */
export function dayRevenue(day: PlanDay): number {
  return day.visits.reduce((sum, visit) => sum + visit.expectedRevenue, 0);
}

/** Milliseconds still to wait so a loading view started at `startedAt` stays up at least `minimum` ms. */
export function revealDelay(startedAt: number, now: number, minimum: number): number {
  return Math.max(0, minimum - (now - startedAt));
}

/** Agent colors of the day list: the chart series of the theme, in the order the agents first appear. */
const AGENT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export interface DayRoute {
  /** Position of the route (day) in the plan, used to select it. */
  index: number;
  agent: string;
  color: string;
  stops: number;
  km: number;
  revenue: number;
  /** Revenue compared with the most valuable route of the plan, 0..1. */
  share: number;
}

export interface DayGroup {
  date: string;
  title: string;
  revenue: number;
  routes: DayRoute[];
}

/** The routes of a plan grouped by working day, each agent with its own color on every day. */
export function groupDays(days: readonly PlanDay[]): DayGroup[] {
  const agents: string[] = [];
  const best = Math.max(0, ...days.map(dayRevenue));
  const groups: DayGroup[] = [];
  days.forEach((day, index) => {
    const agent = day.agent ?? 'One visitor';
    if (!agents.includes(agent)) {
      agents.push(agent);
    }
    const revenue = dayRevenue(day);
    let group = groups.at(-1);
    if (!group || group.date !== day.date) {
      group = { date: day.date, title: dayTitle(day.date), revenue: 0, routes: [] };
      groups.push(group);
    }
    group.revenue += revenue;
    group.routes.push({
      index,
      agent,
      color: AGENT_COLORS[agents.indexOf(agent) % AGENT_COLORS.length],
      stops: day.visits.length,
      km: day.km,
      revenue,
      share: best > 0 ? revenue / best : 0,
    });
  });
  return groups;
}
