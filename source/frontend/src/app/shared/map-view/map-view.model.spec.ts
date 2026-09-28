import type { Circle } from 'ol/style';
import type Style from 'ol/style/Style';
import { toLonLat } from 'ol/proj';
import type Point from 'ol/geom/Point';
import {
  DEFAULT_MARKER_RADIUS,
  MapMarker,
  MARKER_KEY,
  toMarkerFeatures,
  toRouteFeatures,
} from './map-view.model';

const markers: MapMarker[] = [
  { id: 1, latitude: 41.9, longitude: 12.48, color: '#2563eb', radius: 4 },
  { id: 2, latitude: 41.85, longitude: 12.55, color: '#dc2626', radius: 12 },
  { id: 3, latitude: 41.95, longitude: 12.4, color: '#16a34a' },
];

function radiusOf(style: Style): number {
  return (style.getImage() as Circle).getRadius();
}

describe('toMarkerFeatures', () => {
  it('orders features from the largest to the smallest marker', () => {
    const ids = toMarkerFeatures(markers).map((f) => f.getId());
    expect(ids).toEqual([2, 3, 1]);
  });

  it('keeps the marker on the feature and places it at its coordinates', () => {
    const feature = toMarkerFeatures(markers).find((f) => f.getId() === 1)!;
    expect(feature.get(MARKER_KEY)).toBe(markers[0]);
    const [lon, lat] = toLonLat((feature.getGeometry() as Point).getCoordinates());
    expect(lon).toBeCloseTo(12.48, 6);
    expect(lat).toBeCloseTo(41.9, 6);
  });

  it('uses the default radius and enlarges only the highlighted marker', () => {
    const features = toMarkerFeatures(markers, 3);
    const style = (id: number) => features.find((f) => f.getId() === id)!.getStyle() as Style;
    expect(radiusOf(style(3))).toBe(DEFAULT_MARKER_RADIUS + 2);
    expect(style(3).getZIndex()).toBe(1);
    expect(radiusOf(style(1))).toBe(4);
    expect(style(1).getZIndex()).toBe(0);
  });
});

describe('toRouteFeatures', () => {
  it('skips routes with fewer than two points', () => {
    const features = toRouteFeatures([
      {
        id: 'day-1',
        color: '#000',
        points: [
          { latitude: 41.9, longitude: 12.5 },
          { latitude: 41.8, longitude: 12.6 },
        ],
      },
      { id: 'day-2', color: '#000', points: [{ latitude: 41.9, longitude: 12.5 }] },
    ]);
    expect(features.map((f) => f.getId())).toEqual(['day-1']);
    expect(features[0].getGeometry()?.getCoordinates().length).toBe(2);
  });
});
