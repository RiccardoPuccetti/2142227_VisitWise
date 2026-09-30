import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  AnalyticsSummary,
  PlanKpis,
  PlanSummary,
  WhatIfResult,
} from '../../core/models/api.models';
import { ScenarioComparePage } from './scenario-compare-page';

const OPTIONS: AnalyticsSummary = {
  totalRevenue: 10000,
  pointCount: 2,
  customerCount: 2,
  byEnterprise: [
    { enterpriseId: 21, name: 'Enterprise A', color: '#2563eb', revenue: 6000, pointCount: 1 },
    { enterpriseId: 23, name: 'Enterprise B', color: '#16a34a', revenue: 4000, pointCount: 1 },
  ],
  byAgent: [],
  byCity: [],
  topPoints: [],
  pareto: [],
};

const KPIS: PlanKpis = {
  plannedVisits: 40,
  uniqueCustomers: 36,
  coveredRevenue: 395000,
  eligibleRevenue: 560000,
  coverage: 0.71,
  upperBoundRevenue: 402000,
  totalKm: 420.5,
  travelHours: 21.9,
  workingDaysUsed: 20,
  lastVisitDate: '2026-11-27',
  visitsAfterDeadline: 0,
  excludedOutOfRange: 1,
};

const WHAT_IF: WhatIfResult = {
  rows: [
    { workingDays: 20, kpis: KPIS, marginalRevenue: 395000 },
    {
      workingDays: 30,
      kpis: { ...KPIS, coveredRevenue: 480000, coverage: 0.857, workingDaysUsed: 30 },
      marginalRevenue: 85000,
    },
    {
      workingDays: 40,
      kpis: { ...KPIS, coveredRevenue: 520000, coverage: 0.929, workingDaysUsed: 40 },
      marginalRevenue: 40000,
    },
  ],
};

const SCENARIOS: PlanSummary[] = [
  {
    id: 7,
    name: 'Christmas 20 days',
    createdAt: '2026-09-28T10:00:00Z',
    parameters: {
      campaign: 'CHRISTMAS',
      startDate: '2026-11-02',
      deadline: '2026-12-19',
      workingDays: 20,
      enterpriseWeights: [{ enterpriseId: 21, weight: 1.5 }],
      agents: ['AGENT NORTH'],
      planningMode: 'PER_AGENT',
      visitDurationMinutes: 210,
      workdayMinutes: 480,
      averageSpeedKmh: 25,
      roadFactor: 1.3,
      maxDistanceKm: 80,
      base: { latitude: 41.9, longitude: 12.5 },
      travelCostPerKm: 2,
      minRevenue: 0,
    },
    kpis: KPIS,
  },
  {
    id: 8,
    name: 'Christmas 30 days',
    createdAt: '2026-09-28T11:00:00Z',
    parameters: {
      campaign: 'CHRISTMAS',
      startDate: '2026-11-02',
      deadline: '2026-12-19',
      workingDays: 30,
      enterpriseWeights: [{ enterpriseId: 21, weight: 1 }],
      agents: [],
      planningMode: 'SINGLE_VISITOR',
      visitDurationMinutes: 210,
      workdayMinutes: 480,
      averageSpeedKmh: 25,
      roadFactor: 1.3,
      maxDistanceKm: 80,
      base: { latitude: 41.9, longitude: 12.5 },
      travelCostPerKm: 2,
      minRevenue: 0,
    },
    kpis: { ...KPIS, coveredRevenue: 480000, coverage: 0.857, totalKm: 610, workingDaysUsed: 30 },
  },
];

async function setup(scenarios: PlanSummary[], url = '/imports/42/scenarios') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(
        [{ path: 'imports/:importId/scenarios', component: ScenarioComparePage }],
        withComponentInputBinding(),
      ),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
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
  http.expectOne('/api/imports/42/plans').flush(scenarios);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { http, harness };
}

describe('ScenarioComparePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

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
  const select = (selector: string, value: string) => {
    const field = page().querySelector<HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('change'));
  };

  describe('without saved scenarios', () => {
    beforeEach(async () => ({ http, harness } = await setup([])));

    it('explains how to save a scenario and offers the campaign defaults for the what-if', () => {
      expect(text()).toContain('No saved scenarios yet');
      const source = page().querySelector<HTMLSelectElement>('select#whatif-source')!;
      expect(Array.from(source.options).map((option) => option.value)).toEqual([
        'campaign:CHRISTMAS',
      ]);
      expect(page().querySelector<HTMLInputElement>('#whatif-horizons')!.value).toBe('20, 30, 40');
    });

    it('compares the campaign defaults over the typed horizons and draws the coverage curve', async () => {
      type('#whatif-horizons', '40, 20, 30');
      button('Compare horizons').click();
      TestBed.tick();

      const request = http.expectOne('/api/imports/42/plans/what-if');
      expect(request.request.body.horizons).toEqual([20, 30, 40]);
      expect(request.request.body.base).toMatchObject({
        campaign: 'CHRISTMAS',
        startDate: '2026-11-02',
        deadline: '2026-12-19',
        enterpriseWeights: [
          { enterpriseId: 21, weight: 1 },
          { enterpriseId: 23, weight: 1 },
        ],
        base: { latitude: 41.896, longitude: 12.4823 },
      });
      request.flush(WHAT_IF);
      await harness.fixture.whenStable();
      harness.detectChanges();

      const table = page().querySelector('[data-testid="whatif-table"]')!;
      expect(table.querySelectorAll('tbody tr').length).toBe(3);
      expect(table.textContent).toContain('71%');
      expect(table.textContent).toContain('92,9%');
      expect(page().querySelector('[data-testid="whatif-curve"] polyline')).not.toBeNull();
      expect(page().querySelectorAll('[data-testid="whatif-curve"] circle').length).toBe(3);
    });

    it('rejects invalid horizons without calling the API', () => {
      type('#whatif-horizons', '0, 20');
      button('Compare horizons').click();
      TestBed.tick();
      harness.detectChanges();
      expect(text()).toContain('Horizons must be whole numbers between 1 and 260');
      http.expectNone('/api/imports/42/plans/what-if');
    });
  });

  describe('with saved scenarios', () => {
    beforeEach(async () => ({ http, harness } = await setup(SCENARIOS)));

    it('starts from the campaign defaults when no scenario is asked for', () => {
      expect(page().querySelector<HTMLSelectElement>('select#whatif-source')!.value).toBe('campaign:CHRISTMAS');
    });

    it('shows the selected scenarios side by side and marks the best value of each row', () => {
      const table = page().querySelector('[data-testid="compare-table"]')!;
      const headers = Array.from(table.querySelectorAll('thead th')).map((cell) =>
        cell.textContent?.trim(),
      );
      expect(headers).toContain('Christmas 20 days');
      expect(headers).toContain('Christmas 30 days');

      const revenueRow = Array.from(table.querySelectorAll('tbody tr')).find((row) =>
        row.textContent?.includes('Covered revenue'),
      )!;
      const best = revenueRow.querySelectorAll('[data-best="true"]');
      expect(best.length).toBe(1);
      expect(best[0].textContent).toContain('480');

      const kmRow = Array.from(table.querySelectorAll('tbody tr')).find((row) =>
        row.textContent?.includes('Distance'),
      )!;
      expect(kmRow.querySelector('[data-best="true"]')!.textContent).toContain('420,5');
      expect(table.textContent).toContain('Only AGENT NORTH');
      expect(table.textContent).toContain('Single visitor');
      // Campaign dates written like the rest of the app, not as the API's ISO strings.
      expect(table.textContent).toContain('2 Nov 2026 → 19 Dec 2026');
      expect(table.textContent).not.toContain('2026-11-02');
    });

    it('drops a scenario from the comparison when unticked', () => {
      const checkbox = page().querySelector<HTMLInputElement>('input#scenario-8')!;
      checkbox.click();
      harness.detectChanges();
      const headers = Array.from(
        page().querySelectorAll('[data-testid="compare-table"] thead th'),
      ).map((cell) => cell.textContent?.trim());
      expect(headers).not.toContain('Christmas 30 days');
      expect(headers).toContain('Christmas 20 days');
    });

    it('runs the what-if with the parameters of a saved scenario', async () => {
      select('select#whatif-source', 'scenario:7');
      button('Compare horizons').click();
      TestBed.tick();
      const request = http.expectOne('/api/imports/42/plans/what-if');
      expect(request.request.body.base).toEqual(SCENARIOS[0].parameters);
      request.flush(WHAT_IF);
      await harness.fixture.whenStable();
    });

    it('deletes a scenario and removes it from the list', async () => {
      page().querySelector<HTMLButtonElement>('[data-testid="delete-scenario-8"]')!.click();
      TestBed.tick();
      const request = http.expectOne('/api/plans/8');
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(text()).not.toContain('Christmas 30 days');
      expect(text()).toContain('Christmas 20 days');
    });
  });
});

describe('ScenarioComparePage when its data cannot be loaded', () => {
  it('shows the error instead of breaking the page', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/scenarios', component: ScenarioComparePage }],
          withComponentInputBinding(),
        ),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/scenarios');
    http.expectOne((request) => request.url === '/api/planning/campaigns').flush([]);
    http
      .expectOne('/api/imports/42/analytics/summary')
      .flush({ detail: 'Import not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/profile/base').flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/imports/42/plans').flush(null, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Scenario data could not be loaded');
    http.verify();
  });
});

describe('ScenarioComparePage before its data arrives', () => {
  it('shows placeholders in the shape of the page, then the page', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/scenarios', component: ScenarioComparePage }],
          withComponentInputBinding(),
        ),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/imports/42/scenarios');
    const page = () => harness.routeNativeElement as HTMLElement;

    expect(page().querySelector('[data-testid="scenarios-loading"]')).not.toBeNull();

    http.expectOne((request) => request.url === '/api/planning/campaigns').flush([]);
    http.expectOne('/api/imports/42/analytics/summary').flush(OPTIONS);
    http.expectOne('/api/profile/base').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/imports/42/plans').flush([]);
    await harness.fixture.whenStable();

    expect(page().querySelector('[data-testid="scenarios-loading"]')).toBeNull();
    expect(page().querySelector('#whatif-title')).not.toBeNull();
    http.verify();
  });
});

describe('ScenarioComparePage opened from a saved scenario', () => {
  it('sets the scenario named in the link as the plan to analyse', async () => {
    const { http, harness } = await setup(SCENARIOS, '/imports/42/scenarios?analyse=8');
    const source = (harness.routeNativeElement as HTMLElement).querySelector<HTMLSelectElement>('select#whatif-source')!;

    expect(source.value).toBe('scenario:8');
    http.verify();
  });

  it('keeps the campaign defaults when the linked scenario is not among the saved ones', async () => {
    const { http, harness } = await setup(SCENARIOS, '/imports/42/scenarios?analyse=99');
    const source = (harness.routeNativeElement as HTMLElement).querySelector<HTMLSelectElement>('select#whatif-source')!;

    expect(source.value).toBe('campaign:CHRISTMAS');
    http.verify();
  });
});
