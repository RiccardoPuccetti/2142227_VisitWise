import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AnalyticsSummary, DeliveryPoint } from '../../core/models/api.models';
import { MapView } from '../../shared';
import { MapDashboardPage } from './map-dashboard-page';

const NBSP = ' ';

function point(
  id: number,
  revenues: [number, number][],
  extra: Partial<DeliveryPoint> = {},
): DeliveryPoint {
  return {
    id,
    sourceRow: id + 1,
    customerName: `CUSTOMER ${id}`,
    pointName: `POINT ${id}`,
    address: `VIA DEL CORSO ${id}`,
    city: 'ROMA',
    agent: 'AGENT NORTH',
    latitude: 41.9,
    longitude: 12.5,
    geocodeStatus: 'OK',
    totalRevenue: revenues.reduce((sum, [, amount]) => sum + amount, 0),
    revenues: revenues.map(([enterpriseId, amount]) => ({ enterpriseId, amount })),
    ...extra,
  };
}

const POINTS: DeliveryPoint[] = [
  point(1, [
    [21, 1250.5],
    [22, 830],
  ]),
  point(2, [[21, 400]], { agent: 'AGENT SOUTH', city: 'TIVOLI' }),
  point(3, [[22, 300]], { latitude: null, longitude: null, geocodeStatus: 'NOT_FOUND' }),
];

function summary(extra: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    totalRevenue: 2780.5,
    pointCount: 3,
    customerCount: 3,
    byEnterprise: [
      { enterpriseId: 21, name: 'Enterprise A', color: '#2563eb', revenue: 1650.5, pointCount: 2 },
      { enterpriseId: 22, name: 'Enterprise B', color: '#dc2626', revenue: 1130, pointCount: 2 },
    ],
    byAgent: [
      { key: 'AGENT NORTH', revenue: 2380.5, pointCount: 2 },
      { key: 'AGENT SOUTH', revenue: 400, pointCount: 1 },
    ],
    byCity: [
      { key: 'ROMA', revenue: 2380.5, pointCount: 2 },
      { key: 'TIVOLI', revenue: 400, pointCount: 1 },
    ],
    topPoints: [POINTS[0], POINTS[1], POINTS[2]],
    pareto: [
      { points: 1, revenueShare: 0.748 },
      { points: 2, revenueShare: 0.8921 },
      { points: 3, revenueShare: 1 },
    ],
    ...extra,
  };
}

describe('MapDashboardPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeAll(() => {
    // jsdom has no ResizeObserver; OpenLayers needs one.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/map', component: MapDashboardPage }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  // Collapse layout whitespace but keep the no-break space that Intl puts before the euro sign.
  const text = () => page().textContent?.replace(/[ \t\r\n]+/g, ' ') ?? '';

  const summaryRequests = (): TestRequest[] =>
    http.match((r) => r.url === '/api/imports/42/analytics/summary');

  /** Opens the page and answers its first requests (points + unfiltered summary). */
  async function open(url = '/imports/42/map', points: DeliveryPoint[] = POINTS): Promise<void> {
    await harness.navigateByUrl(url);
    http.expectOne('/api/imports/42/points').flush(points);
    for (const request of summaryRequests()) {
      request.flush(summary());
    }
    await harness.fixture.whenStable();
  }

  function button(label: string): HTMLButtonElement {
    const found = Array.from(page().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`No button "${label}"`);
    }
    return found;
  }

  it('shows the indicators, the legend and how many points are on the map', async () => {
    await open();

    expect(page().querySelector('h1')?.textContent).toContain('Map');
    expect(text()).toContain(`2780,50${NBSP}€`);
    expect(text()).toContain('Enterprise A');
    expect(text()).toContain('2 of 3 points on the map');
    expect(text()).toContain('1 point without position');
    // Top 34% of points (1 of 3) hold 74.8% of revenue.
    expect(text()).toContain('74,8%');
    // The revenue leads; the other figures are listed beside it.
    const headline = page().querySelector('[data-testid="kpi-headline"]')!;
    expect(headline.querySelector('h3')?.textContent?.trim()).toBe('Revenue');
    expect(headline.textContent).toContain(`2780,50${NBSP}€`);
    const labels = [...page().querySelectorAll('[data-testid="kpi-details"] dt')].map((term) => term.textContent?.trim());
    expect(labels).toEqual(['Delivery points', 'Customers', 'Top 20% of points']);
  });

  it('links to the import detail to place the points without position', async () => {
    await open();

    const links = [...page().querySelectorAll<HTMLAnchorElement>('a[href="/imports/42"]')];
    expect(links.some((link) => link.textContent?.includes('Fix positions'))).toBe(true);
  });

  it('filters by enterprise, keeps the filter in the URL and reloads the indicators', async () => {
    await open();

    button('Enterprise B').click();
    // Not whenStable(): it would wait for the summary request, which the test answers below.
    TestBed.tick();

    expect(button('Enterprise B').getAttribute('aria-pressed')).toBe('true');
    const [request] = summaryRequests();
    expect(request.request.params.get('enterpriseIds')).toBe('22');
    request.flush(summary({ totalRevenue: 1130 }));
    await harness.fixture.whenStable();

    // The router updates the URL asynchronously: checked once the page is stable.
    expect(TestBed.inject(Router).url).toBe('/imports/42/map?enterprise=22');
    expect(text()).toContain(`1130,00${NBSP}€`);
    expect(text()).toContain('1 of 2 points on the map');
  });

  it('keeps the indicators and charts on screen while the filtered ones load', async () => {
    await open();

    button('Enterprise B').click();
    TestBed.tick();

    // The filtered summary has not arrived yet: the previous figures stay instead of emptying the charts.
    expect(text()).toContain(`2780,50${NBSP}€`);
    expect(page().querySelector('[aria-labelledby="charts-title"]')?.getAttribute('aria-busy')).toBe('true');

    summaryRequests()[0].flush(summary({ totalRevenue: 1130 }));
    await harness.fixture.whenStable();
    expect(text()).toContain(`1130,00${NBSP}€`);
    expect(page().querySelector('[aria-labelledby="charts-title"]')?.getAttribute('aria-busy')).toBe('false');
  });

  it('applies the filters found in the URL', async () => {
    await harness.navigateByUrl('/imports/42/map?agent=AGENT%20SOUTH&minRevenue=100');
    http.expectOne('/api/imports/42/points').flush(POINTS);
    const requests = summaryRequests();
    expect(requests.map((r) => r.request.params.get('agents'))).toContain('AGENT SOUTH');
    requests.forEach((r) => r.flush(summary()));
    await harness.fixture.whenStable();

    expect(page().querySelector<HTMLInputElement>('#dashboard-min-revenue')?.value).toBe('100');
    expect(text()).toContain('1 of 1 points on the map');
  });

  it('shows a point from the list with its revenue per enterprise and moves the focus to it', async () => {
    await open();

    button('POINT 1').click();
    await harness.fixture.whenStable();

    const details = page().querySelector<HTMLElement>('[aria-labelledby="point-details-title"]');
    const detailsText = details?.textContent?.replace(/[ \t\r\n]+/g, ' ') ?? '';
    expect(detailsText).toContain('CUSTOMER 1');
    expect(detailsText).toContain('VIA DEL CORSO 1, ROMA');
    expect(detailsText).toContain(`Enterprise A 1250,50${NBSP}€`);
    expect(detailsText).toContain(`Enterprise B 830,00${NBSP}€`);
    expect(document.activeElement?.id).toBe('point-details-title');
  });

  describe('list of points', () => {
    /** 120 points, POINT 1 with the largest revenue, POINT 120 with the smallest; 100 in ROMA, 20 in TIVOLI. */
    const MANY = Array.from({ length: 120 }, (_, index) =>
      point(index + 1, [[21, 10_000 - index]], { city: index < 100 ? 'ROMA' : 'TIVOLI' }),
    );

    const rows = () => [...page().querySelectorAll('[aria-labelledby="points-title"] tbody tr')];
    const firstPoint = () => rows()[0]?.querySelector('button')?.textContent?.trim();
    const pager = () => page().querySelector<HTMLElement>('nav[aria-label="Pages of points"]');
    const pagerText = () => pager()?.textContent?.replace(/[ \t\r\n]+/g, ' ') ?? '';

    async function choose(selector: string, value: string): Promise<void> {
      const select = page().querySelector<HTMLSelectElement>(selector);
      if (!select) {
        throw new Error(`No select ${selector}`);
      }
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await harness.fixture.whenStable();
    }

    it('shows one page of 50 rows at a time, with previous and next', async () => {
      await open('/imports/42/map', MANY);

      expect(rows()).toHaveLength(50);
      expect(firstPoint()).toBe('POINT 1');
      expect(pagerText()).toContain('Showing 1–50 of 120');
      expect(pagerText()).toContain('of 3');
      expect(button('Previous page').disabled).toBe(true);

      button('Next page').click();
      await harness.fixture.whenStable();

      expect(firstPoint()).toBe('POINT 51');
      expect(pagerText()).toContain('Showing 51–100 of 120');
      expect(button('Previous page').disabled).toBe(false);
    });

    it('jumps to a page chosen in the page selector', async () => {
      await open('/imports/42/map', MANY);

      await choose('#points-page', '3');

      expect(rows()).toHaveLength(20);
      expect(firstPoint()).toBe('POINT 101');
      expect(button('Next page').disabled).toBe(true);
    });

    it('changes the rows per page and starts again from the first page', async () => {
      await open('/imports/42/map', MANY);
      button('Next page').click();
      await harness.fixture.whenStable();

      await choose('#points-page-size', '25');

      expect(rows()).toHaveLength(25);
      expect(firstPoint()).toBe('POINT 1');
      expect(pagerText()).toContain('of 5');
    });

    it('turns to the page of a point clicked on the map and scrolls the list to its row', async () => {
      await open('/imports/42/map', MANY);
      const scroller = page().querySelector<HTMLElement>('[data-testid="points-scroller"]')!;
      // jsdom has no layout: record the scroll instead of performing it.
      const scrollTo = vi.fn();
      scroller.scrollTo = scrollTo as typeof scroller.scrollTo;
      const map = harness.fixture.debugElement.query(By.directive(MapView)).componentInstance as MapView;

      map.markerClick.emit(map.markers().find((marker) => marker.id === 75)!);
      await harness.fixture.whenStable();

      expect(pagerText()).toContain('Showing 51–100 of 120');
      const current = page().querySelector('[aria-labelledby="points-title"] tbody tr[aria-current="true"]');
      expect(current?.querySelector('button')?.textContent?.trim()).toBe('POINT 75');
      expect(scrollTo).toHaveBeenCalledOnce();
    });

    it('recenters the map on a point clicked on the map', async () => {
      await open('/imports/42/map', MANY);
      const map = harness.fixture.debugElement.query(By.directive(MapView)).componentInstance as MapView;
      const centerOn = vi.spyOn(map, 'centerOn');

      map.markerClick.emit(map.markers().find((marker) => marker.id === 75)!);
      await harness.fixture.whenStable();

      expect(centerOn).toHaveBeenCalledOnce();
      expect(centerOn.mock.calls[0][0]).toBe(75);
    });

    it('from the desktop layout shows the selected point in a popup anchored to its marker', async () => {
      const wide = { matches: true, addEventListener() {}, removeEventListener() {} };
      // jsdom has no matchMedia: give it one to spy on.
      window.matchMedia ??= (() => ({ ...wide, matches: false })) as never;
      const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(wide as unknown as MediaQueryList);
      try {
        await open('/imports/42/map', MANY);
        const map = harness.fixture.debugElement.query(By.directive(MapView)).componentInstance as MapView;

        map.markerClick.emit(map.markers().find((marker) => marker.id === 75)!);
        await harness.fixture.whenStable();

        // Same breakpoint as the desktop sidebar of the app shell (1024 px).
        expect(matchMedia).toHaveBeenCalledWith('(min-width: 64rem)');
        expect(map.popupId()).toBe(75);
        const popup = page().querySelector('app-map-view [data-map-popup]');
        expect(popup?.textContent).toContain('CUSTOMER 75');
        expect(page().querySelector('[aria-label="Selected point"] app-point-details')).toBeNull();
      } finally {
        matchMedia.mockRestore();
      }
    });

    it('from the desktop layout shows a point without position over the map corner, not below the map', async () => {
      const wide = { matches: true, addEventListener() {}, removeEventListener() {} };
      window.matchMedia ??= (() => ({ ...wide, matches: false })) as never;
      const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(wide as unknown as MediaQueryList);
      try {
        await open();

        // POINT 3 has no coordinates: no marker to anchor a popup to.
        button('POINT 3').click();
        await harness.fixture.whenStable();

        const corner = page().querySelector('app-map-view ~ [data-map-corner]');
        expect(corner?.textContent).toContain('CUSTOMER 3');
        expect(page().querySelector('[aria-label="Selected point"]')).toBeNull();
      } finally {
        matchMedia.mockRestore();
      }
    });

    it('starts again from the first page when a filter changes', async () => {
      await open('/imports/42/map', MANY);
      button('Next page').click();
      await harness.fixture.whenStable();

      await choose('#dashboard-city', 'TIVOLI');

      expect(firstPoint()).toBe('POINT 101');
      expect(pagerText()).toContain('Showing 1–20 of 20');
    });
  });

  it('shows placeholders in the charts and the list until the first data arrives', async () => {
    await harness.navigateByUrl('/imports/42/map');

    expect(page().querySelectorAll('[data-testid="chart-placeholder"]').length).toBe(4);
    expect(page().textContent).not.toContain('No revenue for these filters');
    expect(page().querySelectorAll('[data-testid="points-scroller"] tbody [data-testid="row-placeholder"]').length).toBeGreaterThan(0);

    // The points arrive first: nothing of them shows yet, so the page changes once, when everything is there.
    http.expectOne('/api/imports/42/points').flush(POINTS);
    TestBed.tick();
    expect(page().querySelectorAll('[data-testid="points-scroller"] tbody tr[data-point-id]').length).toBe(0);
    expect(page().querySelector('app-enterprise-legend')).toBeNull();
    expect(page().querySelector('app-map-view')).toBeNull();
    expect(page().querySelector('[data-testid="map-placeholder"]')).not.toBeNull();

    summaryRequests().forEach((r) => r.flush(summary()));
    await harness.fixture.whenStable();
    expect(page().querySelector('[data-testid="chart-placeholder"]')).toBeNull();
    expect(page().querySelector('[data-testid="row-placeholder"]')).toBeNull();
  });

  it('shows the problem when the points cannot be loaded', async () => {
    await harness.navigateByUrl('/imports/42/map');
    http
      .expectOne('/api/imports/42/points')
      .flush({ detail: 'Import 42 not found' }, { status: 404, statusText: 'Not Found' });
    summaryRequests().forEach((r) => r.flush(summary()));
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Import 42 not found');
  });

  it('shows the problem, not endless placeholders, when the indicators cannot be loaded', async () => {
    await harness.navigateByUrl('/imports/42/map');
    http.expectOne('/api/imports/42/points').flush(POINTS);
    summaryRequests().forEach((r) =>
      r.flush({ detail: 'Summary not available' }, { status: 500, statusText: 'Server Error' }),
    );
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Summary not available');
    expect(page().querySelector('[data-testid="chart-placeholder"]')).toBeNull();
    expect(page().querySelector('[data-testid="row-placeholder"]')).toBeNull();
  });
});
