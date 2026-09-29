import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import type Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import type LineString from 'ol/geom/LineString';
import type Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MapMarker,
  MapRoute,
  MARKER_KEY,
  MAX_FIT_ZOOM,
  toMarkerFeatures,
  toRouteFeatures,
} from './map-view.model';

/** Pixels between a marker and its popup. */
export const POPUP_GAP = 14;

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * OpenStreetMap map with markers and routes (OpenLayers). Shared by the map dashboard,
 * the planner and the agent plan.
 *
 * - `markers`: circles, colored and sized by the page (e.g. enterprise color, radius from revenue).
 * - `routes`: polylines, e.g. one per planned day.
 * - `highlightedId`: marker drawn larger and on top (e.g. the row hovered in a table).
 * - `markerClick`: emits the clicked marker; the page shows its own popup or side panel.
 * - `popupId` + content marked `data-map-popup`: a popup anchored to the right of that marker, which moves with
 *   the map when it is panned or zoomed; hidden when `popupId` is null or matches no marker.
 * - `centerOn(id, padding)`: pans (same zoom) so the marker sits in the middle of the area the padding leaves free.
 * - The view fits the data whenever markers or routes change (`autoFit`, default true).
 *
 * The map canvas is not readable by screen readers: every page that uses it must also show the same
 * points as text (table or list). Height comes from the host class (default `h-96`).
 *
 * ```html
 * <app-map-view class="h-[32rem]" [markers]="markers()" [routes]="routes()"
 *               ariaLabel="Delivery points" (markerClick)="select($event)" />
 * ```
 */
@Component({
  selector: 'app-map-view',
  template: `<div
      #target
      class="size-full"
      tabindex="0"
      role="region"
      [attr.aria-label]="ariaLabel()"
    ></div>
    <div class="map-popup"><ng-content select="[data-map-popup]" /></div>`,
})
export class MapView {
  readonly markers = input<readonly MapMarker[]>([]);
  readonly routes = input<readonly MapRoute[]>([]);
  readonly highlightedId = input<MapMarker['id'] | null>(null);
  /** Marker the projected `data-map-popup` content is anchored to; null hides it. */
  readonly popupId = input<MapMarker['id'] | null>(null);
  readonly autoFit = input(true);
  readonly ariaLabel = input('Map');
  readonly markerClick = output<MapMarker>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly markerSource = new VectorSource<Feature<Point>>();
  private readonly routeSource = new VectorSource<Feature<LineString>>();
  private readonly ready = signal(false);
  private map: OlMap | null = null;
  private popup: Overlay | null = null;

  constructor() {
    classes(() => 'relative block h-96 overflow-hidden rounded-xl border');

    afterNextRender(() => {
      const target = this.host.nativeElement.querySelector('div') as HTMLDivElement;
      // Right of the marker, vertically centered on it; clicks inside it do not reach the map.
      this.popup = new Overlay({
        element: this.host.nativeElement.querySelector('.map-popup') as HTMLDivElement,
        positioning: 'center-left',
        offset: [POPUP_GAP, 0],
        stopEvent: true,
      });
      this.map = new OlMap({
        target,
        keyboardEventTarget: target,
        // OpenLayers' own default is onFocusOnly: true, which, because the target has a tabindex (keyboard access),
        // makes wheel zoom and drag pan wait for a click on the map first. Keyboard pan/zoom still need the focus.
        interactions: defaultInteractions({ onFocusOnly: false }),
        layers: [
          new TileLayer({ source: new OSM() }),
          new VectorLayer({ source: this.routeSource }),
          new VectorLayer({ source: this.markerSource }),
        ],
        view: new View({
          center: fromLonLat([DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude]),
          zoom: DEFAULT_ZOOM,
        }),
        overlays: [this.popup],
      });
      this.map.on('singleclick', (event) => {
        const marker = this.map?.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature.get(MARKER_KEY) as MapMarker | undefined,
        );
        if (marker) {
          this.markerClick.emit(marker);
        }
      });
      this.map.on('pointermove', (event) => {
        const marker = this.map?.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature.get(MARKER_KEY) as MapMarker | undefined,
        );
        target.style.cursor = marker ? 'pointer' : '';
        target.title = marker?.title ?? '';
      });
      this.ready.set(true);
    });

    effect(() => {
      this.markerSource.clear();
      this.markerSource.addFeatures(toMarkerFeatures(this.markers(), this.highlightedId()));
    });

    effect(() => {
      this.markers();
      const id = this.popupId();
      if (this.ready()) {
        this.popup?.setPosition(id === null ? undefined : this.markerCoordinate(id));
      }
    });

    effect(() => {
      this.routeSource.clear();
      this.routeSource.addFeatures(toRouteFeatures(this.routes()));
    });

    // Fit only when the data changes, not when the highlighted marker changes.
    effect(() => {
      this.markers();
      this.routes();
      if (this.ready() && this.autoFit()) {
        this.fitToData();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.map?.setTarget(undefined);
      this.map = null;
    });
  }

  /**
   * Pans, keeping the zoom, so the marker is in the middle of the map minus `padding` (pixels covered on each side,
   * `[top, right, bottom, left]`, e.g. by a popup). Animated unless the user prefers reduced motion.
   */
  centerOn(
    id: MapMarker['id'],
    padding: readonly [number, number, number, number] = [0, 0, 0, 0],
    duration = prefersReducedMotion() ? 0 : 300,
  ): void {
    const view = this.map?.getView();
    const coordinate = this.markerCoordinate(id);
    const resolution = view?.getResolution();
    if (!view || !coordinate || !resolution) {
      return;
    }
    const [top, right, bottom, left] = padding;
    const center = [
      coordinate[0] + ((right - left) / 2) * resolution,
      coordinate[1] + ((top - bottom) / 2) * resolution,
    ];
    if (duration > 0) {
      view.animate({ center, duration });
    } else {
      view.setCenter(center);
    }
  }

  private markerCoordinate(id: MapMarker['id']): number[] | undefined {
    return this.markerSource
      .getFeatures()
      .find((feature) => (feature.get(MARKER_KEY) as MapMarker | undefined)?.id === id)
      ?.getGeometry()
      ?.getCoordinates();
  }

  /** Zooms to show every marker and route. Does nothing when there is no data. */
  fitToData(): void {
    const extent = createEmpty();
    for (const sourceExtent of [this.markerSource.getExtent(), this.routeSource.getExtent()]) {
      if (sourceExtent) {
        extend(extent, sourceExtent);
      }
    }
    if (!this.map || isEmpty(extent)) {
      return;
    }
    this.map.getView().fit(extent, { padding: [32, 32, 32, 32], maxZoom: MAX_FIT_ZOOM });
  }
}
