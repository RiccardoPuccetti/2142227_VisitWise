import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AnalyticsSummary, PlanResult } from '../../core/models/api.models';
import { PlannerPage } from './planner-page';

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

describe('PlannerPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeAll(() => {
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
    await harness.fixture.whenStable();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = () => page().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(page().querySelectorAll('button')).find((item) =>
      item.textContent?.includes(label),
    ) as HTMLButtonElement;

  it('simulates the configured plan and shows KPIs, timeline and itinerary', async () => {
    button('Generate plan').click();
    TestBed.tick();

    const request = http.expectOne('/api/imports/42/plans/simulate');
    expect(request.request.body).toMatchObject({
      campaign: 'CHRISTMAS',
      startDate: '2026-11-02',
      workingDays: 20,
      enterpriseWeights: [{ enterpriseId: 21, weight: 1 }],
    });
    request.flush(RESULT);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text()).toContain('Covered revenue');
    expect(text()).toContain('85%');
    expect(text()).toContain('POINT 1');
    expect(page().querySelector('[aria-label="Itinerary for 2 November 2026"]')).not.toBeNull();
  });

  it('saves the simulated parameters as a named scenario', async () => {
    button('Generate plan').click();
    TestBed.tick();
    http.expectOne('/api/imports/42/plans/simulate').flush(RESULT);
    await harness.fixture.whenStable();
    harness.detectChanges();

    const name = page().querySelector<HTMLInputElement>('#planner-scenario-name')!;
    name.value = 'Christmas priority';
    name.dispatchEvent(new Event('input'));
    button('Save scenario').click();
    TestBed.tick();

    const request = http.expectOne('/api/imports/42/plans');
    expect(request.request.body.name).toBe('Christmas priority');
    request.flush({ id: 7, name: 'Christmas priority' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(text()).toContain('Scenario saved');
  });
});
