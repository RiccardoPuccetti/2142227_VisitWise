import type {
  ColumnMapping,
  DeliveryPoint,
  Enterprise,
  GeocodeStatus,
  GeocodingProgress,
} from '../../core/models/api.models';
import { mainEnterpriseColor, type MapMarker } from '../../shared';

/** A coordinate typed by the analyst: the number, or the message to show under the field. */
export type ParsedCoordinate = { value: number } | { error: string };

const NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/**
 * US-09: reads a latitude (limit 90) or longitude (limit 180). Italian keyboards type a decimal comma, so "41,9" is
 * read as 41.9. The backend checks the same range (endpoint 8).
 */
export function parseCoordinate(text: string, limit: 90 | 180): ParsedCoordinate {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { error: 'Enter a number' };
  }
  if (!NUMBER.test(trimmed)) {
    return { error: 'Enter a number, e.g. 41.9028' };
  }
  const value = Number(trimmed.replace(',', '.'));
  if (value < -limit || value > limit) {
    return { error: `Enter a number between -${limit} and ${limit}` };
  }
  return { value };
}

/**
 * US-08: the background job is working, so the page keeps asking for the progress. Points can stay PENDING on a READY
 * import (geocoder unavailable, or imported before the job existed): then nothing runs until the analyst retries.
 */
export function geocodingRunning(progress: GeocodingProgress | null): boolean {
  return progress?.status === 'GEOCODING';
}

/** Addresses without coordinates that a retry asks the geocoder for again (US-09). */
export function missingAddresses(progress: GeocodingProgress): number {
  return progress.pending + progress.notFound;
}

/** Share of the points that have coordinates, as a whole percent (100 when there is nothing to locate). */
export function locatedPercent(progress: Pick<GeocodingProgress, 'total' | 'located'>): number {
  return progress.total === 0 ? 100 : Math.round((progress.located / progress.total) * 100);
}

const GEOCODE_LABELS: Record<GeocodeStatus, string> = {
  OK: 'Found',
  FROM_FILE: 'From the file',
  MANUAL: 'Set by hand',
  NOT_FOUND: 'Not found',
  PENDING: 'Waiting',
};

export function geocodeStatusLabel(status: GeocodeStatus): string {
  return GEOCODE_LABELS[status];
}

/** Points without coordinates can be placed by hand (US-09). */
export function needsLocation(status: GeocodeStatus): boolean {
  return status === 'NOT_FOUND' || status === 'PENDING';
}

export interface MappingRow {
  field: string;
  column: string;
}

/** Which Excel column each field was read from (US-11), unmapped optional fields left out. */
export function mappingRows(mapping: ColumnMapping): MappingRow[] {
  const fields: [string, string | null][] = [
    ['Customer', mapping.customer],
    ['Delivery point', mapping.deliveryPoint],
    ['Address', mapping.address],
    ['City', mapping.city],
    ['Agent', mapping.agent],
    ['Latitude', mapping.latitude],
    ['Longitude', mapping.longitude],
  ];
  return [
    ...fields
      .filter((entry): entry is [string, string] => entry[1] !== null)
      .map(([field, column]) => ({ field, column })),
    ...mapping.enterprises.map((enterprise) => ({ field: enterprise.name, column: enterprise.sourceColumn })),
  ];
}

/**
 * The territory preview of the import (US-11, US-38): one small marker per located point, in the color of the
 * enterprise with the largest revenue there (`mainEnterpriseColor`, as on the map dashboard). Points without coordinates are left
 * out.
 */
export function territoryMarkers(points: readonly DeliveryPoint[], enterprises: readonly Enterprise[]): MapMarker[] {
  const colors = new Map(enterprises.map((enterprise) => [enterprise.id, enterprise.color]));
  return points
    .filter((point) => point.latitude !== null && point.longitude !== null)
    .map((point) => {
      return {
        id: point.id,
        latitude: point.latitude as number,
        longitude: point.longitude as number,
        color: mainEnterpriseColor(point.revenues, colors),
        radius: 5,
        title: point.pointName,
      };
    });
}
