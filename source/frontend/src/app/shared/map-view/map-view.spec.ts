import { TestBed } from '@angular/core/testing';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom';
import { fromLonLat } from 'ol/proj';
import { MapView } from './map-view';

describe('MapView', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; OpenLayers needs one to track the map size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('renders a focusable, labelled map region', async () => {
    const fixture = TestBed.createComponent(MapView);
    fixture.componentRef.setInput('ariaLabel', 'Delivery points');
    fixture.componentRef.setInput('markers', [
      { id: 1, latitude: 41.9, longitude: 12.5, color: '#2563eb' },
    ]);
    await fixture.whenStable();

    const region = (fixture.nativeElement as HTMLElement).querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Delivery points');
    expect(region?.getAttribute('tabindex')).toBe('0');
    // OpenLayers attached its viewport to the target.
    expect(region?.querySelector('.ol-viewport')).not.toBeNull();
    fixture.destroy();
  });

  it('zooms with the mouse wheel without taking the focus first', async () => {
    const fixture = TestBed.createComponent(MapView);
    await fixture.whenStable();
    const map = fixture.componentInstance['map']!;
    // The map region has a tabindex (keyboard access) and does not have the focus.
    expect(document.activeElement).not.toBe(map.getTargetElement());
    const wheel = map.getInteractions().getArray().find((candidate) => candidate instanceof MouseWheelZoom)!;
    // OpenLayers keeps the condition private: read it to check the focus is not required.
    const condition = (wheel as unknown as { condition_: (event: unknown) => boolean }).condition_;

    expect(condition({ map, type: 'wheel', originalEvent: new WheelEvent('wheel') })).toBe(true);
    fixture.destroy();
  });

  it('centers a marker, keeping the zoom, in the part of the map that the padding leaves free', async () => {
    const fixture = TestBed.createComponent(MapView);
    fixture.componentRef.setInput('markers', [
      { id: 1, latitude: 41.9, longitude: 12.5, color: '#2563eb' },
      { id: 2, latitude: 42.0, longitude: 12.7, color: '#2563eb' },
    ]);
    await fixture.whenStable();
    const view = fixture.componentInstance['map']!.getView();
    const zoom = view.getZoom();
    const resolution = view.getResolution()!;

    // 200 px covered on the right: the marker sits 100 px left of the map center.
    fixture.componentInstance.centerOn(2, [0, 200, 0, 0], 0);

    const [x, y] = fromLonLat([12.7, 42.0]);
    const [centerX, centerY] = view.getCenter()!;
    expect(centerX).toBeCloseTo(x + 100 * resolution, 6);
    expect(centerY).toBeCloseTo(y, 6);
    expect(view.getZoom()).toBe(zoom);
    fixture.destroy();
  });

  it('anchors the popup to its marker, so it moves with the map, and hides it without one', async () => {
    const fixture = TestBed.createComponent(MapView);
    fixture.componentRef.setInput('markers', [{ id: 2, latitude: 42.0, longitude: 12.7, color: '#2563eb' }]);
    fixture.componentRef.setInput('popupId', 2);
    await fixture.whenStable();
    const popup = fixture.componentInstance['popup']!;

    expect(popup.getPosition()).toEqual(fromLonLat([12.7, 42.0]));

    fixture.componentRef.setInput('popupId', null);
    await fixture.whenStable();
    expect(popup.getPosition()).toBeUndefined();
    fixture.destroy();
  });
});
