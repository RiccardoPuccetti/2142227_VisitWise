import { TestBed } from '@angular/core/testing';
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
});
