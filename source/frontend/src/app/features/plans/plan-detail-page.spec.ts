import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { PlanDay, PlannedVisit, PlanResult } from '../../core/models/api.models';
import { PlanDetailPage } from './plan-detail-page';

const NBSP = ' ';

function visit(slot: number, agent: string, date: string, pointName: string): PlannedVisit {
  return {
    deliveryPointId: 1000 + slot,
    customerName: `CUSTOMER OF ${pointName}`,
    pointName,
    address: `VIA DEL CORSO ${slot}`,
    city: 'ROMA',
    agent,
    latitude: 41.9031,
    longitude: 12.4794,
    date,
    dayIndex: 0,
    slot,
    expectedRevenue: 1250.5,
    travelKm: 2.1,
  };
}

function day(date: string, agent: string, visits: PlannedVisit[]): PlanDay {
  return { date, agent, visits, km: 12.3 };
}

const PLAN: PlanResult = {
  id: 3,
  name: 'Christmas 20 days',
  parameters: {
    campaign: 'CHRISTMAS',
    startDate: '2026-11-02',
    deadline: '2026-12-19',
    workingDays: 20,
    enterpriseWeights: [],
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
    plannedVisits: 3,
    uniqueCustomers: 3,
    coveredRevenue: 3751.5,
    eligibleRevenue: 5000,
    coverage: 0.75,
    upperBoundRevenue: 4000,
    totalKm: 36.9,
    travelHours: 1.5,
    workingDaysUsed: 2,
    lastVisitDate: '2026-11-03',
    visitsAfterDeadline: 0,
    excludedOutOfRange: 0,
  },
  days: [
    day('2026-11-02', 'AGENT NORTH', [
      visit(1, 'AGENT NORTH', '2026-11-02', 'RISTORANTE ACME'),
      visit(2, 'AGENT NORTH', '2026-11-02', 'BAR BETA'),
    ]),
    day('2026-11-03', 'AGENT SOUTH', [visit(1, 'AGENT SOUTH', '2026-11-03', 'CAFFE GAMMA')]),
    day('2026-11-09', 'AGENT NORTH', [visit(1, 'AGENT NORTH', '2026-11-09', 'OSTERIA DELTA')]),
  ],
  notPlanned: [],
  warnings: ['1 delivery points without coordinates were excluded'],
};

describe('PlanDetailPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'imports/:importId/plans/:planId', component: PlanDetailPage }],
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

  async function open(url = '/imports/42/plans/3'): Promise<void> {
    await harness.navigateByUrl(url);
    http.expectOne('/api/plans/3').flush(PLAN);
    await harness.fixture.whenStable();
  }

  const exportLink = () =>
    Array.from(page().querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Export to Excel'),
    );

  it('shows the plan name, its indicators and its warnings', async () => {
    await open();

    expect(page().querySelector('h1')?.textContent).toContain('Christmas 20 days');
    expect(text()).toContain(`3751,50${NBSP}€`);
    expect(text()).toContain('36,9 km');
    // As in the planner: the covered revenue leads, with a bar for its share of the eligible revenue.
    const headline = page().querySelector('[data-testid="kpi-headline"]')!;
    expect(headline.querySelector('h3')?.textContent?.trim()).toBe('Covered revenue');
    expect(headline.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('75');
    const details = [...page().querySelectorAll('[data-testid="kpi-details"] > div')].map(
      (row) => `${row.querySelector('dt')?.textContent?.trim()}: ${row.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );
    expect(details).toEqual(['Visits: 3 3 customers', 'Working days: 2 of 20 available', 'Distance: 36,9 km 1,5 hours of travel']);
    expect(page().querySelector('[role="status"]')?.textContent).toContain(
      '1 delivery points without coordinates were excluded',
    );
  });

  it('says it is a saved scenario and links back to the scenarios it was opened from', async () => {
    await open();

    expect(text()).toContain('Saved scenario');
    const back = Array.from(page().querySelectorAll<HTMLAnchorElement>('a[href="/imports/42/scenarios"]')).find(
      (link) => link.textContent?.includes('Back to the scenarios'),
    );
    expect(back).toBeDefined();
  });

  const dayButtons = () => Array.from(page().querySelectorAll<HTMLButtonElement>('[data-testid="calendar-day"]'));
  const selectedDay = () =>
    page().querySelector('[data-testid="calendar-selected-day"]')?.textContent?.replace(/[ \t\r\n]+/g, ' ') ?? '';
  const pagerButton = (label: string) => page().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('shows one week at a time: its five days, and the stops of the selected day in their order', async () => {
    await open();

    const week = page().querySelector('[data-testid="calendar-week"]')!.textContent!.replace(/[ \t\r\n]+/g, ' ');
    expect(week).toContain('Week of 2 Nov 2026');
    expect(week).toContain('week 1 of 2');
    const days = dayButtons();
    expect(days.map((button) => button.textContent?.replace(/[ \t\r\n]+/g, ' ').trim())).toEqual([
      'Mon 2 Nov 2 visits',
      'Tue 3 Nov 1 visit',
      'Wed 4 Nov No visits',
      'Thu 5 Nov No visits',
      'Fri 6 Nov No visits',
    ]);
    expect(days[0].getAttribute('aria-pressed')).toBe('true');
    expect(selectedDay().indexOf('Ristorante Acme')).toBeGreaterThan(-1);
    expect(selectedDay().indexOf('Ristorante Acme')).toBeLessThan(selectedDay().indexOf('Bar Beta'));
    expect(selectedDay()).not.toContain('Caffe Gamma');

    days[1].click();
    await harness.fixture.whenStable();
    expect(dayButtons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(selectedDay()).toContain('Caffe Gamma');
    expect(selectedDay()).not.toContain('Ristorante Acme');
  });

  it('moves between the weeks with the pager, opening the first day with visits', async () => {
    await open();
    expect(pagerButton('Previous week').disabled).toBe(true);

    pagerButton('Next week').click();
    await harness.fixture.whenStable();

    const week = page().querySelector('[data-testid="calendar-week"]')!.textContent!.replace(/[ \t\r\n]+/g, ' ');
    expect(week).toContain('Week of 9 Nov 2026');
    expect(week).toContain('week 2 of 2');
    expect(selectedDay()).toContain('Osteria Delta');
    expect(pagerButton('Next week').disabled).toBe(true);
    expect(pagerButton('Previous week').disabled).toBe(false);
  });

  it('opens OpenStreetMap directions from the previous stop in a new tab', async () => {
    await open();

    const link = page().querySelector<HTMLAnchorElement>('a[href*="openstreetmap.org/directions"]');
    expect(link?.href).toBe(
      'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=41.896%2C12.4823%3B41.9031%2C12.4794',
    );
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
    expect(link?.textContent).toContain('opens in a new tab');
  });

  it('exports the whole plan to Excel', async () => {
    await open();

    expect(exportLink()?.getAttribute('href')).toBe('/api/plans/3/export');
  });

  it('shows one agent, keeps the choice in the URL and exports only that agent', async () => {
    await open();

    const select = page().querySelector<HTMLSelectElement>('#plan-agent');
    select!.value = 'AGENT SOUTH';
    select!.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/imports/42/plans/3?agent=AGENT%20SOUTH');
    expect(text()).toContain('Caffe Gamma');
    expect(text()).not.toContain('Ristorante Acme');
    expect(exportLink()?.getAttribute('href')).toBe('/api/plans/3/export?agent=AGENT%20SOUTH');
  });

  it('applies the agent found in the URL', async () => {
    await open('/imports/42/plans/3?agent=AGENT%20NORTH');

    expect(page().querySelector<HTMLSelectElement>('#plan-agent')?.value).toBe('AGENT NORTH');
    expect(text()).not.toContain('Caffe Gamma');
  });

  it('shows the problem when the plan cannot be loaded', async () => {
    await harness.navigateByUrl('/imports/42/plans/3');
    http
      .expectOne('/api/plans/3')
      .flush({ detail: 'Plan 3 not found' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Plan 3 not found');
  });
});
