import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  AnalyticsSummary,
  GeocodingProgress,
  PlanResult,
  RouteResponse,
  StartingBase,
} from '../../core/models/api.models';
import { PLAN_REVEAL_MS, PlannerPage } from './planner-page';

const BASE: StartingBase = {
  address: 'Via del Corso 300',
  city: 'Roma',
  latitude: 41.9009,
  longitude: 12.48,
};

const PROGRESS_DONE: GeocodingProgress = {
  status: 'READY',
  total: 2,
  located: 2,
  pending: 0,
  notFound: 0,
  errorMessage: null,
};

const ROAD: RouteResponse = {
  source: 'OSRM',
  km: 12.4,
  minutes: 31,
  legs: [
    { km: 6.1, minutes: 15 },
    { km: 6.3, minutes: 16 },
  ],
  geometry: [
    { latitude: 41.896, longitude: 12.4823 },
    { latitude: 41.898, longitude: 12.49 },
    { latitude: 41.9, longitude: 12.5 },
    { latitude: 41.896, longitude: 12.4823 },
  ],
};

const OPTIONS: AnalyticsSummary = {
  totalRevenue: 10000,
  pointCount: 2,
  customerCount: 2,
  byEnterprise: [
    { enterpriseId: 21, name: 'Enterprise A', color: '#2563eb', revenue: 10000, pointCount: 2 },
  ],
  byAgent: [{ key: 'AGENT NORTH', revenue: 10000, pointCount: 2 }],
  byCity: [],
  topPoints: [],
  pareto: [],
};

const RESULT: PlanResult = {
  id: null,
  name: null,
  parameters: {
    campaign: 'CHRISTMAS',
    startDate: '2026-11-02',
    deadline: '2026-12-19',
    workingDays: 20,
    enterpriseWeights: [{ enterpriseId: 21, weight: 1 }],
    agents: [],
    planningMode: 'PER_AGENT',
    visitDurationMinutes: 210,
    workdayMinutes: 480,
    averageSpeedKmh: 25,
    roadFactor: 1.3,
    maxDistanceKm: 80,
    base: { latitude: 41.896, longitude: 12.4823 },
    travelCostPerKm: 2,
    minRevenue: 0,
  },
  kpis: {
    plannedVisits: 2,
    uniqueCustomers: 2,
    coveredRevenue: 8500,
    eligibleRevenue: 10000,
    coverage: 0.85,
    upperBoundRevenue: 9000,
    totalKm: 42.5,
    travelHours: 1.7,
    workingDaysUsed: 1,
    lastVisitDate: '2026-11-02',
    visitsAfterDeadline: 0,
    excludedOutOfRange: 0,
  },
  days: [
    {
      date: '2026-11-02',
      agent: 'AGENT NORTH',
      km: 42.5,
      visits: [
        {
          deliveryPointId: 1,
          customerName: 'CUSTOMER 1',
          pointName: 'POINT 1',
          address: 'VIA ROMA 1',
          city: 'ROMA',
          agent: 'AGENT NORTH',
          latitude: 41.9,
          longitude: 12.5,
          date: '2026-11-02',
          dayIndex: 0,
          slot: 1,
          expectedRevenue: 8500,
          travelKm: 4,
        },
      ],
    },
  ],
  notPlanned: [],
  warnings: [],
};

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

describe('PlannerPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        // No minimum loading time: the tests answer the requests themselves.
        { provide: PLAN_REVEAL_MS, useValue: 0 },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/planner', component: PlannerPage }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/planner');
    http
      .expectOne((request) => request.url === '/api/planning/campaigns')
      .flush([
        {
          code: 'CHRISTMAS',
          label: 'Before Christmas',
          startDate: '2026-11-02',
          endDate: '2026-12-19',
          workingDays: 34,
        },
      ]);
    http.expectOne('/api/imports/42/analytics/summary').flush(OPTIONS);
    http.expectOne('/api/profile/base').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/imports/42/geocoding').flush(PROGRESS_DONE);
    await harness.fixture.whenStable();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = () => page().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(page().querySelectorAll('button')).find((item) =>
      item.textContent?.includes(label),
    ) as HTMLButtonElement;
  const type = (selector: string, value: string) => {
    const field = page().querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };

  it('renders campaign and mode as styled native selects', () => {
    expect(page().querySelector('hlm-native-select select#planner-campaign')).not.toBeNull();
    expect(page().querySelector('hlm-native-select select#planner-mode')).not.toBeNull();
    expect(text()).toContain('No starting point yet');
  });

  describe('working days slider', () => {
    const thumb = () => page().querySelector<HTMLElement>('#planner-working-days [role="slider"]')!;
    const setDeadline = async (value: string) => {
      type('#planner-deadline', value);
      await harness.fixture.whenStable();
    };

    it('spans the working days of the campaign and starts with all of them', () => {
      expect(thumb().getAttribute('aria-valuemin')).toBe('1');
      expect(thumb().getAttribute('aria-valuemax')).toBe('34');
      expect(thumb().getAttribute('aria-valuenow')).toBe('34');
      expect(text()).toContain('34 of 34');
    });

    it('moves with the keyboard and plans the chosen number of days', async () => {
      thumb().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await harness.fixture.whenStable();

      expect(thumb().getAttribute('aria-valuenow')).toBe('33');
      expect(text()).toContain('33 of 34');
      button('Generate plan').click();
      TestBed.tick();
      const request = http.expectOne('/api/imports/42/plans/simulate');
      expect(request.request.body.workingDays).toBe(33);
      request.flush({ ...RESULT, days: [] });
      await harness.fixture.whenStable();
    });

    it('follows a shorter time frame, never offering days after the deadline', async () => {
      await setDeadline('2026-11-06');

      expect(thumb().getAttribute('aria-valuemax')).toBe('5');
      expect(thumb().getAttribute('aria-valuenow')).toBe('5');
      expect(text()).toContain('5 of 5');
    });

    it('keeps a free horizon when there is no deadline', async () => {
      await setDeadline('');

      expect(thumb().getAttribute('aria-valuemax')).toBe('260');
      expect(thumb().getAttribute('aria-valuenow')).toBe('34');
    });

    it('does not plan a time frame without working days', async () => {
      await setDeadline('2026-10-30');

      expect(text()).toContain('No working days between the start date and the deadline.');
      button('Generate plan').click();
      TestBed.tick();
      http.expectNone('/api/imports/42/plans/simulate');
    });
  });

  it('geocodes the typed address and uses it as the plan base', async () => {
    type('#planner-base-address', 'Via del Corso 300');
    type('#planner-base-city', 'Roma');
    button('Use this starting point').click();
    TestBed.tick();

    const save = http.expectOne('/api/profile/base');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ address: 'Via del Corso 300', city: 'Roma' });
    save.flush(BASE);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(text()).toContain('Saved · Via del Corso 300, Roma');

    button('Generate plan').click();
    TestBed.tick();
    const simulate = http.expectOne('/api/imports/42/plans/simulate');
    expect(simulate.request.body.base).toEqual({ latitude: 41.9009, longitude: 12.48 });
    simulate.flush(RESULT);
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
  });

  it('shows the geocoding error when the address is unknown', async () => {
    type('#planner-base-address', 'Nowhere 1');
    button('Use this starting point').click();
    TestBed.tick();
    http
      .expectOne('/api/profile/base')
      .flush(
        { title: 'Address not found', detail: 'No location found for "Nowhere 1".' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(text()).toContain('No location found');
  });

  it('simulates the configured plan and shows KPIs, timeline and the real road route', async () => {
    button('Generate plan').click();
    TestBed.tick();

    const request = http.expectOne('/api/imports/42/plans/simulate');
    expect(request.request.body).toMatchObject({
      campaign: 'CHRISTMAS',
      startDate: '2026-11-02',
      workingDays: 34,
      enterpriseWeights: [{ enterpriseId: 21, weight: 1 }],
      base: { latitude: 41.896, longitude: 12.4823 },
    });
    request.flush(RESULT);
    await harness.fixture.whenStable();

    const route = http.expectOne('/api/imports/42/plans/route');
    expect(route.request.body).toEqual({
      base: { latitude: 41.896, longitude: 12.4823 },
      stops: [{ latitude: 41.9, longitude: 12.5 }],
      averageSpeedKmh: 25,
      roadFactor: 1.3,
    });
    route.flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).toContain('Covered revenue');
    expect(text()).toContain('85%');
    // The covered revenue leads, with a bar for its share of the eligible revenue.
    const headline = page().querySelector('[data-testid="kpi-headline"]')!;
    expect(headline.querySelector('h3')?.textContent?.trim()).toBe('Covered revenue');
    expect(headline.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('85');
    const labels = [...page().querySelectorAll('[data-testid="kpi-details"] dt')].map((term) => term.textContent?.trim());
    expect(labels).toEqual(['Visits', 'Working days', 'Distance']);
    expect(text()).toContain('POINT 1');
    expect(page().querySelector('[aria-label="Itinerary for 2 Nov 2026"]')).not.toBeNull();
    const summary = page().querySelector('[data-testid="planner-road-summary"]')!.textContent!;
    expect(summary.replace(/\s+/g, ' ')).toContain('12,4 km · 31 min (road route)');
  });

  it('leaves out the note on points without coordinates, already told by the geocoding strip', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http.expectOne('/api/imports/42/plans/simulate').flush({
      ...RESULT,
      warnings: [
        '8 delivery points without coordinates were excluded',
        '3 delivery points are farther than 50 km from the base and were excluded',
      ],
    });
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).not.toContain('without coordinates');
    expect(text()).not.toContain('Planning notes');
    expect(text()).toContain('3 delivery points are farther than 50 km from the base and were excluded');
  });

  it('falls back to the estimate when the road service is unavailable', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http.expectOne('/api/imports/42/plans/simulate').flush(RESULT);
    await harness.fixture.whenStable();
    http
      .expectOne('/api/imports/42/plans/route')
      .flush({ title: 'Down' }, { status: 503, statusText: 'Service Unavailable' });
    await harness.fixture.whenStable();
    harness.detectChanges();

    const summary = page().querySelector('[data-testid="planner-road-summary"]')!.textContent!;
    expect(summary.replace(/\s+/g, ' ')).toContain('42,5 km (estimate)');
  });

  it('says when the distance and time were measured on the road network', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http
      .expectOne('/api/imports/42/plans/simulate')
      .flush({ ...RESULT, kpis: { ...RESULT.kpis, travelSource: 'OSRM' } });
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).toContain('h on the road (road network)');
    expect(text()).not.toContain('h on the road (estimate)');
  });

  it('saves the simulated parameters as a named scenario', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http.expectOne('/api/imports/42/plans/simulate').flush(RESULT);
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    button('Save as scenario').click();
    await harness.fixture.whenStable();

    // The dialog is rendered in an overlay on the document body.
    const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
    const name = dialog()!.querySelector<HTMLInputElement>('#planner-scenario-name')!;
    name.value = 'Christmas priority';
    name.dispatchEvent(new Event('input'));
    Array.from(dialog()!.querySelectorAll('button'))
      .find((item) => item.textContent?.trim() === 'Save scenario')!
      .click();
    TestBed.tick();

    const request = http.expectOne('/api/imports/42/plans');
    expect(request.request.body.name).toBe('Christmas priority');
    request.flush({ id: 7, name: 'Christmas priority' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(text()).toContain('Scenario saved');
    await vi.waitFor(() => expect(dialog()).toBeNull());
  });

  const tab = (label: string) =>
    Array.from(page().querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) =>
      item.textContent?.includes(label),
    )!;

  it('opens the plan tab with a loading view while the plan is generated, and goes back to the setup', async () => {
    expect(tab('Setup').getAttribute('aria-selected')).toBe('true');
    expect(tab('Plan').disabled).toBe(true);

    button('Generate plan').click();
    TestBed.tick();

    expect(tab('Plan').getAttribute('aria-selected')).toBe('true');
    expect(page().querySelector('[data-testid="plan-loading"]')).not.toBeNull();

    http.expectOne('/api/imports/42/plans/simulate').flush(RESULT);
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(page().querySelector('[data-testid="plan-loading"]')).toBeNull();
    expect(text()).toContain('Covered revenue');

    tab('Setup').click();
    await harness.fixture.whenStable();
    expect(tab('Setup').getAttribute('aria-selected')).toBe('true');
    expect(tab('Plan').disabled).toBe(false);
  });

  it('lists the routes by day: the day with its total, then each agent with stops, distance and revenue', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http.expectOne('/api/imports/42/plans/simulate').flush(RESULT);
    await harness.fixture.whenStable();
    http.expectOne('/api/imports/42/plans/route').flush(ROAD);
    await harness.fixture.whenStable();
    harness.detectChanges();

    const rail = page().querySelector('[aria-labelledby="planner-days-title"]')!;
    const heading = rail.querySelector('h4')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(heading).toContain('Mon 2 Nov');
    expect(heading).toContain('1 route');
    const route = rail.querySelector('li li button')!;
    const words = route.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(words).toContain('AGENT NORTH');
    expect(words).toContain('1 stop');
    expect(words).toContain('42,5 km');
    expect(words).toContain('8500');
    expect(route.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('PlannerPage while addresses are still being geocoded', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/planner', component: PlannerPage }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/planner');
    http.expectOne((request) => request.url === '/api/planning/campaigns').flush([]);
    http.expectOne('/api/imports/42/analytics/summary').flush(OPTIONS);
    http.expectOne('/api/profile/base').flush(BASE);
  });

  afterEach(() => {
    harness.fixture.destroy();
    http.verify();
  });

  const text = () =>
    (harness.routeNativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  it('shows the progress banner and the saved base', async () => {
    http.expectOne('/api/imports/42/geocoding').flush({
      ...PROGRESS_DONE,
      status: 'GEOCODING',
      located: 3,
      pending: 7,
      total: 10,
    });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).toContain('Locating customer addresses');
    expect(text()).toContain('3 of 10 addresses placed on the map');
    expect(text()).toContain('Via del Corso 300, Roma');
  });

  it('offers a retry when some addresses were not found', async () => {
    http.expectOne('/api/imports/42/geocoding').flush({ ...PROGRESS_DONE, notFound: 2 });
    await harness.fixture.whenStable();
    harness.detectChanges();
    // One slim line: what is missing, why it matters, and the two ways to fix it.
    expect(text()).toContain('2 of 2 addresses not located');
    expect(text()).toContain('left out of the plan');
    const root = harness.routeNativeElement as HTMLElement;
    const fix = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href="/imports/42"]')).find((link) =>
      link.textContent?.includes('Fix positions'),
    );
    expect(fix).toBeDefined();

    const retry = root.querySelector<HTMLButtonElement>('button[aria-label="Retry geocoding"]')!;
    expect(retry.textContent?.trim()).toBe('Retry');
    retry.click();
    TestBed.tick();
    const request = http.expectOne('/api/imports/42/geocoding/retry');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await harness.fixture.whenStable();
  });

  it('offers a retry, instead of locating forever, for addresses left waiting on a ready import', async () => {
    http.expectOne('/api/imports/42/geocoding').flush({ ...PROGRESS_DONE, located: 7, pending: 3, total: 10 });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).not.toContain('Locating customer addresses');
    expect(text()).toContain('3 of 10 addresses not located');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('button[aria-label="Retry geocoding"]')).not.toBeNull();
  });
});

describe('PlannerPage when its data cannot be loaded', () => {
  it('shows the error instead of breaking the page', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLAN_REVEAL_MS, useValue: 0 },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'imports/:importId/planner', component: PlannerPage }], withComponentInputBinding()),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/planner');
    http.expectOne((request) => request.url === '/api/planning/campaigns').flush([]);
    http
      .expectOne('/api/imports/42/analytics/summary')
      .flush({ detail: 'Import not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/profile/base').flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/imports/42/geocoding').flush(PROGRESS_DONE);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Planner data could not be loaded');
    http.verify();
  });
});

describe('PlannerPage before its data arrives', () => {
  it('shows placeholders in the shape of the setup, then the setup', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLAN_REVEAL_MS, useValue: 0 },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'imports/:importId/planner', component: PlannerPage }], withComponentInputBinding()),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/planner');
    const page = () => harness.routeNativeElement as HTMLElement;

    expect(page().querySelector('[data-testid="planner-loading"]')).not.toBeNull();

    http.expectOne((request) => request.url === '/api/planning/campaigns').flush([]);
    http.expectOne('/api/imports/42/analytics/summary').flush(OPTIONS);
    http.expectOne('/api/profile/base').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/imports/42/geocoding').flush(PROGRESS_DONE);
    await harness.fixture.whenStable();

    expect(page().querySelector('[data-testid="planner-loading"]')).toBeNull();
    expect(page().querySelector('select#planner-campaign')).not.toBeNull();
    http.verify();
  });
});
