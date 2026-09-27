import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import type { GeoPoint } from '../../core/models/api.models';

/** Default map center: Rome. Used when there is nothing to show. */
export const DEFAULT_CENTER: GeoPoint = { latitude: 41.9028, longitude: 12.4964 };
export const DEFAULT_ZOOM = 11;
/** Zoom used when the data is a single point (fitting a zero-size extent would zoom in forever). */
export const MAX_FIT_ZOOM = 15;
export const DEFAULT_MARKER_RADIUS = 6;

/** A circle on the map, e.g. one delivery point. The page decides color and size. */
export interface MapMarker {
  id: number | string;
  latitude: number;
  longitude: number;
  /** CSS color, usually the enterprise color. */
  color: string;
  /** Radius in pixels, e.g. scaled on revenue. Defaults to 6. */
  radius?: number;
  /** Shown as a tooltip when the pointer is over the marker. */
  title?: string;
}

/** A polyline through stops, e.g. the itinerary of one day. */
export interface MapRoute {
  id: number | string;
  color: string;
  points: readonly GeoPoint[];
}

export const MARKER_KEY = 'marker';

function markerStyle(marker: MapMarker, highlighted: boolean): Style {
  return new Style({
    image: new CircleStyle({
      radius: (marker.radius ?? DEFAULT_MARKER_RADIUS) + (highlighted ? 2 : 0),
      fill: new Fill({ color: marker.color }),
      stroke: new Stroke({
        color: highlighted ? '#111827' : '#ffffff',
        width: highlighted ? 3 : 1.5,
      }),
    }),
    // Highlighted marker is drawn above the others.
    zIndex: highlighted ? 1 : 0,
  });
}

/**
 * One OpenLayers feature per marker, largest first so that small markers stay visible
 * (OpenLayers draws features in order). Each feature keeps its marker under `MARKER_KEY`.
 */
export function toMarkerFeatures(
  markers: readonly MapMarker[],
  highlightedId: MapMarker['id'] | null = null,
): Feature<Point>[] {
  return [...markers]
    .sort((a, b) => (b.radius ?? DEFAULT_MARKER_RADIUS) - (a.radius ?? DEFAULT_MARKER_RADIUS))
    .map((marker) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.longitude, marker.latitude])),
      });
      feature.setId(marker.id);
      feature.set(MARKER_KEY, marker);
      feature.setStyle(markerStyle(marker, marker.id === highlightedId));
      return feature;
    });
}

/** One polyline feature per route; routes with fewer than 2 points are skipped. */
export function toRouteFeatures(routes: readonly MapRoute[]): Feature<LineString>[] {
  return routes
    .filter((route) => route.points.length >= 2)
    .map((route) => {
      const feature = new Feature({
        geometry: new LineString(route.points.map((p) => fromLonLat([p.longitude, p.latitude]))),
      });
      feature.setId(route.id);
      feature.setStyle(new Style({ stroke: new Stroke({ color: route.color, width: 3 }) }));
      return feature;
    });
}
