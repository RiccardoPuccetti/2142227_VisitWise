import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import type { DeliveryPoint, GeocodingProgress, ImportDetail } from '../../core/models/api.models';
import { field, settle, submit, text, type } from '../auth/form-test-utils';
import { GEOCODING_POLL_MS, ImportDetailPage } from './import-detail-page';

const DETAIL: ImportDetail = {
  id: 7,
  name: 'Sample 2025',
  sourceFileName: 'sample-erp-layout.xlsx',
  createdAt: '2026-09-28T10:15:00+02:00',
  status: 'READY',
  totalRows: 129,
  importedRows: 73,
  skippedRows: 56,
  geocodedRows: 71,
  enterprises: [
    { id: 21, name: 'Wine', color: '#0072B2', sourceColumn: 'ENTERPRISE A' },
    { id: 22, name: 'Beer', color: '#D55E00', sourceColumn: 'ENTERPRISE B' },
  ],
  mapping: {
    customer: 'Ragione Sociale',
    deliveryPoint: 'Punto Vendita',
    address: 'Indirizzo',
    city: 'Comune',
    agent: 'Agente',
    latitude: null,
    longitude: null,
    enterprises: [
      { sourceColumn: 'ENTERPRISE A', name: 'Wine', color: '#0072B2' },
      { sourceColumn: 'ENTERPRISE B', name: 'Beer', color: '#D55E00' },
    ],
  },
  agents: ['AGENT NORTH', 'AGENT SOUTH'],
  cities: ['ROMA', 'TIVOLI'],
  notFoundCount: 1,
  errorMessage: null,
};

function point(id: number, pointName: string, geocodeStatus: DeliveryPoint['geocodeStatus']): DeliveryPoint {
  const located = geocodeStatus !== 'NOT_FOUND' && geocodeStatus !== 'PENDING';
  return {
    id,
    sourceRow: id - 999,
    customerName: 'ACME SRL',
    pointName,
    address: `VIA DEL CORSO ${id}`,
    city: 'ROMA',
    agent: 'AGENT NORTH',
    latitude: located ? 41.9 : null,
    longitude: located ? 12.48 : null,
    geocodeStatus,
    totalRevenue: 1250.5,
    revenues: [{ enterpriseId: 21, amount: 1250.5 }],
  };
}

const POINTS = [point(1001, 'BAR ACME', 'OK'), point(1002, 'BAR ACME 2', 'NOT_FOUND')];

const DONE: GeocodingProgress = { status: 'READY', total: 2, located: 1, pending: 0, notFound: 1, errorMessage: null };

describe('ImportDetailPage (US-07..US-09, US-11, US-12)', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const render = async (
    detail: ImportDetail = DETAIL,
    points: DeliveryPoint[] = POINTS,
    progress: GeocodingProgress = DONE,
  ) => {
    const fixture = TestBed.createComponent(ImportDetailPage);
    fixture.componentRef.setInput('importId', '7');
    TestBed.tick();
    http.expectOne({ method: 'GET', url: '/api/imports/7' }).flush(detail);
    http.expectOne({ method: 'GET', url: '/api/imports/7/points' }).flush(points);
    http.expectOne({ method: 'GET', url: '/api/imports/7/geocoding' }).flush(progress);
    await settle(fixture);
    return fixture;
  };

  const root = (fixture: Awaited<ReturnType<typeof render>>) => fixture.nativeElement as HTMLElement;

  const button = (label: string, container: ParentNode = document.body) => {
    const found = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => text(candidate) === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`No button "${label}"`);
    return found;
  };

  const rows = (fixture: Awaited<ReturnType<typeof render>>) =>
    Array.from(root(fixture).querySelectorAll('[data-testid="points"] tbody tr'));

  const statuses = (fixture: Awaited<ReturnType<typeof render>>) =>
    Array.from(root(fixture).querySelectorAll('[role="status"]'))
      .map((region) => text(region))
      .join(' ');

  /** "term value" for every pair of a description list. */
  const pairs = (list: Element | null) =>
    Array.from(list?.querySelectorAll('dt') ?? []).map(
      (term) => `${text(term)} ${text(term.nextElementSibling)}`,
    );

  /** Lets awaited continuations run without waiting for the pending HTTP calls. */
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve));

  /** Waits for the (shortened) geocoding poll to fire. */
  const nextPoll = () => new Promise((resolve) => setTimeout(resolve, 30));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImportDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: GEOCODING_POLL_MS, useValue: 10 },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('polls the geocoding progress every 3 seconds by default', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(GEOCODING_POLL_MS)).toBe(3000);
  });

  it('shows the import report: name, file, rows, enterprises and column mapping (US-07, US-11)', async () => {
    const fixture = await render();
    const page = root(fixture);

    expect(text(page.querySelector('h1'))).toBe('Sample 2025');
    expect(text(page)).toContain('sample-erp-layout.xlsx');
    expect(page.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-28T10:15:00+02:00');
    expect(pairs(page.querySelector('[data-testid="report"] dl'))).toEqual([
      'Rows in the file 129',
      'Imported 73',
      'Skipped 56',
    ]);
    expect(text(page.querySelector('[aria-label="Enterprises"]'))).toBe('Wine Beer');
    const mapping = pairs(page.querySelector('[data-testid="mapping"] dl'));
    expect(mapping).toContain('Customer Ragione Sociale');
    expect(mapping).toContain('Wine ENTERPRISE A');
    expect(text(page)).toContain('2 agents');
    expect(text(page)).toContain('2 cities');
  });

  it('shows the server message when the import cannot be loaded', async () => {
    const fixture = TestBed.createComponent(ImportDetailPage);
    fixture.componentRef.setInput('importId', '7');
    TestBed.tick();
    http.expectOne('/api/imports/7').flush({ detail: 'Import 7 not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/imports/7/points').flush({ detail: 'Import 7 not found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/imports/7/geocoding')
      .flush({ detail: 'Import 7 not found' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);

    expect(text(root(fixture).querySelector('[role="alert"]'))).toContain('Import 7 not found');
    expect(root(fixture).querySelector('h1')).toBeNull();
  });

  describe('geocoding (US-08, US-09)', () => {
    const RUNNING: GeocodingProgress = {
      status: 'GEOCODING',
      total: 73,
      located: 40,
      pending: 31,
      notFound: 2,
      errorMessage: null,
    };

    it('shows the progress while addresses are located and refreshes it until the end', async () => {
      const fixture = await render({ ...DETAIL, status: 'GEOCODING' }, POINTS, RUNNING);

      const bar = root(fixture).querySelector('[role="progressbar"]');
      expect(bar?.getAttribute('aria-valuenow')).toBe('55');
      expect(text(root(fixture).querySelector('[data-testid="geocoding"]'))).toContain('40 of 73 addresses located');

      await nextPoll();
      http.expectOne('/api/imports/7/geocoding').flush({ ...RUNNING, located: 60, pending: 11 });
      await settle(fixture);
      expect(root(fixture).querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('82');

      await nextPoll();
      http.expectOne('/api/imports/7/geocoding').flush({ ...RUNNING, status: 'READY', located: 71, pending: 0 });
      await flushPromises();
      TestBed.tick();
      // Finished: the detail and the points are read again, then the polling stops.
      http.expectOne('/api/imports/7').flush(DETAIL);
      http.expectOne('/api/imports/7/points').flush(POINTS);
      await settle(fixture);

      expect(root(fixture).querySelector('[role="progressbar"]')).toBeNull();
      expect(text(root(fixture).querySelector('[data-testid="geocoding"]'))).toContain('71 of 73 addresses located');
      await nextPoll();
      http.expectNone('/api/imports/7/geocoding');
    });

    it('offers to retry the addresses not found and follows the new run', async () => {
      const fixture = await render();
      expect(text(root(fixture).querySelector('[data-testid="geocoding"]'))).toContain('1 address not found');

      button('Retry the missing addresses').click();
      await settle(fixture);
      http
        .expectOne({ method: 'POST', url: '/api/imports/7/geocoding/retry' })
        .flush(null, { status: 202, statusText: 'Accepted' });
      await settle(fixture);

      // The job starts in the background: the import may still say READY right after the retry.
      http.expectOne('/api/imports/7/geocoding').flush(DONE);
      await settle(fixture);
      await nextPoll();
      http.expectOne('/api/imports/7/geocoding').flush({ ...DONE, status: 'GEOCODING', pending: 1, notFound: 0 });
      await settle(fixture);
      expect(root(fixture).querySelector('[role="progressbar"]')).not.toBeNull();

      await nextPoll();
      http.expectOne('/api/imports/7/geocoding').flush(DONE);
      await flushPromises();
      TestBed.tick();
      http.expectOne('/api/imports/7').flush(DETAIL);
      http.expectOne('/api/imports/7/points').flush(POINTS);
      await settle(fixture);
    });

    it('reloads the points when a retry ends before the first poll (every address cached)', async () => {
      const fixture = await render();

      button('Retry the missing addresses').click();
      await settle(fixture);
      http.expectOne({ method: 'POST', url: '/api/imports/7/geocoding/retry' }).flush(null, { status: 202, statusText: 'Accepted' });
      await settle(fixture);
      http.expectOne('/api/imports/7/geocoding').flush({ ...DONE, located: 2, notFound: 0 });
      await flushPromises();
      TestBed.tick();

      http.expectOne('/api/imports/7').flush({ ...DETAIL, notFoundCount: 0 });
      http.expectOne('/api/imports/7/points').flush([POINTS[0], { ...POINTS[1], geocodeStatus: 'OK' }]);
      await settle(fixture);
      expect(text(rows(fixture)[1])).toContain('Found');
      await nextPoll();
      http.expectNone('/api/imports/7/geocoding');
    });

    it('offers to locate the addresses left waiting when nothing runs, without polling', async () => {
      const stopped: GeocodingProgress = { ...DONE, located: 0, pending: 2, notFound: 0 };
      const fixture = await render(DETAIL, POINTS, stopped);
      const geocoding = root(fixture).querySelector('[data-testid="geocoding"]')!;

      expect(root(fixture).querySelector('[role="progressbar"]')).toBeNull();
      expect(text(geocoding)).toContain('2 addresses not located yet');
      expect(button('Retry the missing addresses', geocoding).disabled).toBe(false);
      await nextPoll();
      http.expectNone('/api/imports/7/geocoding');
    });

    it('explains why the geocoding stopped', async () => {
      const message = 'Geocoding interrupted: the geocoding service was unavailable. Retry later.';
      const fixture = await render({ ...DETAIL, errorMessage: message }, POINTS, { ...DONE, errorMessage: message });

      expect(text(root(fixture).querySelector('[data-testid="geocoding"] [role="alert"]'))).toContain(message);
    });
  });

  describe('points (US-09, US-11)', () => {
    it('lists the delivery points with their location status', async () => {
      const fixture = await render();

      const headers = Array.from(root(fixture).querySelectorAll('[data-testid="points"] th')).map((cell) =>
        text(cell),
      );
      expect(headers).toEqual(['Delivery point', 'Address', 'Agent', 'Revenue', 'Location', 'Actions']);
      expect(rows(fixture)).toHaveLength(2);
      const first = text(rows(fixture)[0]);
      expect(first).toContain('BAR ACME');
      expect(first).toContain('ACME SRL');
      expect(first).toContain('VIA DEL CORSO 1001, ROMA');
      expect(first).toContain('AGENT NORTH');
      expect(first).toContain('Found');
      expect(text(rows(fixture)[1])).toContain('Not found');
    });

    it('shows only the points not located when asked', async () => {
      const fixture = await render();

      button('Not located (1)', root(fixture)).click();
      await settle(fixture);

      expect(rows(fixture)).toHaveLength(1);
      expect(text(rows(fixture)[0])).toContain('BAR ACME 2');
    });

    it('shows long lists 50 points at a time', async () => {
      const many = Array.from({ length: 120 }, (_, index) => point(2000 + index, `POINT ${index + 1}`, 'OK'));
      const fixture = await render(DETAIL, many);

      expect(rows(fixture)).toHaveLength(50);
      expect(text(root(fixture).querySelector('[data-testid="pages"]'))).toContain('Page 1 of 3');
      expect(button('Previous page', root(fixture)).disabled).toBe(true);

      button('Next page', root(fixture)).click();
      button('Next page', root(fixture)).click();
      await settle(fixture);

      expect(rows(fixture)).toHaveLength(20);
      expect(text(rows(fixture)[0])).toContain('POINT 101');
      expect(button('Next page', root(fixture)).disabled).toBe(true);
    });

    it('places a point that was not found by hand', async () => {
      const fixture = await render();
      expect(() => button('Set the location of BAR ACME', rows(fixture)[0])).toThrow();

      button('Set the location of BAR ACME 2', root(fixture)).click();
      await settle(fixture);
      type(field(fixture, 'location-latitude'), '41.9028');
      type(field(fixture, 'location-longitude'), '12.4964');
      await submit(fixture, '[data-testid="location-form"] form');
      http
        .expectOne({ method: 'PATCH', url: '/api/imports/7/points/1002/location' })
        .flush({ ...POINTS[1], latitude: 41.9028, longitude: 12.4964, geocodeStatus: 'MANUAL' });
      await settle(fixture);
      http.expectOne('/api/imports/7/geocoding').flush({ ...DONE, located: 2, notFound: 0 });
      await settle(fixture);

      expect(root(fixture).querySelector('[data-testid="location-form"]')).toBeNull();
      expect(document.activeElement).toBe(root(fixture).querySelector('#points-title'));
      expect(text(rows(fixture)[1])).toContain('Set by hand');
      expect(statuses(fixture)).toContain('BAR ACME 2 is now on the map.');
      expect(text(root(fixture).querySelector('[data-testid="geocoding"]'))).toContain('2 of 2 addresses located');
    });
  });

  it('gives the focus back to the row when the location form is cancelled', async () => {
    const fixture = await render();
    const trigger = button('Set the location of BAR ACME 2', root(fixture));

    trigger.click();
    await settle(fixture);
    button('Cancel', root(fixture).querySelector('[data-testid="location-form"]')!).click();
    await settle(fixture);

    expect(root(fixture).querySelector('[data-testid="location-form"]')).toBeNull();
    expect(document.activeElement).toBe(button('Set the location of BAR ACME 2', root(fixture)));
  });

  it('deletes the import after confirmation and goes back to the list (US-12)', async () => {
    const fixture = await render();

    button('Delete import', root(fixture)).click();
    await settle(fixture);
    const dialog = document.body.querySelector<HTMLElement>('[role="alertdialog"]');
    expect(text(dialog)).toContain('Delete Sample 2025?');
    button('Delete', dialog!).click();
    await settle(fixture);
    http.expectOne({ method: 'DELETE', url: '/api/imports/7' }).flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(navigate).toHaveBeenCalledWith('/imports');
  });
});
