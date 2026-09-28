import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import type { ImportSummary } from '../../core/models/api.models';
import { settle, text } from '../auth/form-test-utils';
import { IMPORTS_VIEW_STORAGE_KEY } from './imports-view';
import { ImportsListPage } from './imports-list-page';

const SAMPLE_2025: ImportSummary = {
  id: 7,
  name: 'Sample 2025',
  sourceFileName: 'sample-erp-layout.xlsx',
  createdAt: '2026-09-28T10:15:00+02:00',
  status: 'GEOCODING',
  totalRows: 129,
  importedRows: 73,
  skippedRows: 56,
  geocodedRows: 40,
  enterprises: [
    { id: 21, name: 'Wine', color: '#0072B2', sourceColumn: 'ENTERPRISE A' },
    { id: 22, name: 'Beer', color: '#D55E00', sourceColumn: 'ENTERPRISE B' },
  ],
};

const SAMPLE_2024: ImportSummary = {
  ...SAMPLE_2025,
  id: 3,
  name: 'Sample 2024',
  createdAt: '2025-09-30T09:00:00+02:00',
  status: 'READY',
  geocodedRows: 73,
};

describe('ImportsListPage (US-10, US-12)', () => {
  let http: HttpTestingController;

  const page = () => document.body;

  const render = async (imports: ImportSummary[] = [SAMPLE_2025, SAMPLE_2024]) => {
    const fixture = TestBed.createComponent(ImportsListPage);
    TestBed.tick();
    http.expectOne({ method: 'GET', url: '/api/imports' }).flush(imports);
    await settle(fixture);
    return fixture;
  };

  const button = (label: string, root: ParentNode = page()) => {
    const found = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => text(candidate) === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`No button "${label}"`);
    return found;
  };

  const dialog = () => page().querySelector<HTMLElement>('[role="alertdialog"]');

  /** Text of every live status region of the page. */
  const statuses = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('[role="status"]'))
      .map((region) => text(region))
      .join(' ');

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ImportsListPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shows every import as a card linking to its detail, newest first', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;

    expect(text(root.querySelector('h1'))).toBe('Imports');
    const cards = root.querySelectorAll('[data-testid="import-card"]');
    expect(cards).toHaveLength(2);
    const first = cards[0];
    expect(text(first.querySelector('a[href="/imports/7"]'))).toBe('Sample 2025');
    expect(text(first)).toContain('sample-erp-layout.xlsx');
    expect(text(first)).toContain('73 points');
    expect(text(first)).toContain('Locating addresses');
    expect(text(first)).toContain('Wine');
    expect(text(first)).toContain('Beer');
    expect(first.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-28T10:15:00+02:00');
    expect(text(cards[1])).toContain('Ready');
  });

  it('shows a loading state until the list arrives', async () => {
    const fixture = TestBed.createComponent(ImportsListPage);
    TestBed.tick();

    expect(statuses(fixture.nativeElement as HTMLElement)).toContain('Loading imports');

    http.expectOne('/api/imports').flush([]);
    await settle(fixture);
  });

  it('invites to import the first file when there is none', async () => {
    const fixture = await render([]);
    const root = fixture.nativeElement as HTMLElement;

    expect(text(root)).toContain('No imports yet');
    expect(root.querySelectorAll('a[href="/imports/new"]').length).toBeGreaterThan(0);
    expect(root.querySelector('[data-testid="import-card"]')).toBeNull();
  });

  it('shows the server message when the list cannot be loaded', async () => {
    const fixture = TestBed.createComponent(ImportsListPage);
    TestBed.tick();
    http
      .expectOne('/api/imports')
      .flush({ detail: 'Database unavailable' }, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(text(alert)).toContain('Database unavailable');
  });

  it('switches to a table and remembers the choice', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    const table = button('Table', root);
    expect(button('Cards', root).getAttribute('aria-pressed')).toBe('true');

    table.click();
    await settle(fixture);

    expect(table.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-testid="import-card"]')).toBeNull();
    const headers = Array.from(root.querySelectorAll('th')).map((cell) => text(cell));
    expect(headers).toEqual(['Name', 'Created', 'File', 'Points', 'Status', 'Actions']);
    const rows = root.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(text(rows[0].querySelector('a[href="/imports/7"]'))).toBe('Sample 2025');
    expect(localStorage.getItem(IMPORTS_VIEW_STORAGE_KEY)).toBe('table');
  });

  it('opens in the view chosen last time', async () => {
    localStorage.setItem(IMPORTS_VIEW_STORAGE_KEY, 'table');

    const fixture = await render();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(2);
  });

  describe('delete (US-12)', () => {
    const openDialog = async (fixture: Awaited<ReturnType<typeof render>>) => {
      button('Delete Sample 2025', fixture.nativeElement as HTMLElement).click();
      await settle(fixture);
      const opened = dialog();
      if (!opened) throw new Error('The confirmation dialog did not open');
      return opened;
    };

    it('asks for confirmation, naming what is deleted', async () => {
      const fixture = await render();

      const opened = await openDialog(fixture);

      expect(text(opened)).toContain('Delete Sample 2025?');
      expect(text(opened)).toContain('points, revenues and saved plans');
      http.expectNone({ method: 'DELETE' });
      button('Cancel', opened).click();
      await settle(fixture);
    });

    it('keeps the import when cancelled', async () => {
      const fixture = await render();
      const opened = await openDialog(fixture);

      button('Cancel', opened).click();
      await settle(fixture);

      http.expectNone({ method: 'DELETE' });
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="import-card"]')).toHaveLength(2);
    });

    it('deletes the import and removes it from the list', async () => {
      const fixture = await render();
      const opened = await openDialog(fixture);

      button('Delete', opened).click();
      await settle(fixture);
      http
        .expectOne({ method: 'DELETE', url: '/api/imports/7' })
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      const root = fixture.nativeElement as HTMLElement;
      const cards = root.querySelectorAll('[data-testid="import-card"]');
      expect(cards).toHaveLength(1);
      expect(text(cards[0])).toContain('Sample 2024');
      expect(statuses(root)).toContain('Sample 2025 was deleted');
    });

    it('keeps the import and shows the error when the delete fails', async () => {
      const fixture = await render();
      const opened = await openDialog(fixture);

      button('Delete', opened).click();
      await settle(fixture);
      http
        .expectOne({ method: 'DELETE', url: '/api/imports/7' })
        .flush({ detail: 'Import 7 not found' }, { status: 404, statusText: 'Not Found' });
      await settle(fixture);

      const root = fixture.nativeElement as HTMLElement;
      expect(text(root.querySelector('[role="alert"]'))).toContain('Import 7 not found');
      expect(root.querySelectorAll('[data-testid="import-card"]')).toHaveLength(2);
    });
  });
});
