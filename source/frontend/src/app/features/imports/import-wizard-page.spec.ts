import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ImportPreview, ImportSummary } from '../../core/models/api.models';
import { field, settle, text, type } from '../auth/form-test-utils';
import { ImportWizardPage } from './import-wizard-page';

const PREVIEW: ImportPreview = {
  fileName: 'Sales 2025.xlsx',
  sheetName: 'Sheet1',
  headers: ['Ragione Sociale', 'Punto Vendita', 'Indirizzo', 'Comune', 'Agente', 'Totale', 'ENTERPRISE A', 'ENTERPRISE B', 'Lat', 'Lon'],
  sampleRows: [
    ['ACME SRL', 'BAR ACME', 'VIA DEL CORSO 300', 'ROMA', 'AGENT NORTH', '1330.5', '1250.5', '80', '', ''],
    ['ACME SRL Totale', '', '', '', '', '1330.5', '1250.5', '80', '', ''],
  ],
  totalRows: 3,
  suggestedMapping: {
    customer: 'Ragione Sociale',
    deliveryPoint: 'Punto Vendita',
    address: 'Indirizzo',
    city: null,
    agent: 'Agente',
    latitude: null,
    longitude: null,
    enterprises: [
      { sourceColumn: 'ENTERPRISE A', name: 'ENTERPRISE A', color: '#0072B2' },
      { sourceColumn: 'ENTERPRISE B', name: 'ENTERPRISE B', color: '#D55E00' },
    ],
  },
};

const SUMMARY: ImportSummary = {
  id: 7,
  name: 'Sales 2025',
  sourceFileName: 'Sales 2025.xlsx',
  createdAt: '2026-09-28T10:15:00Z',
  status: 'READY',
  totalRows: 3,
  importedRows: 2,
  skippedRows: 1,
  geocodedRows: 0,
  enterprises: [
    { id: 21, name: 'ENTERPRISE A', color: '#0072b2', sourceColumn: 'ENTERPRISE A' },
    { id: 22, name: 'Beer', color: '#d55e00', sourceColumn: 'ENTERPRISE B' },
  ],
};

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('ImportWizardPage', () => {
  let http: HttpTestingController;

  const render = async () => {
    const fixture = TestBed.createComponent(ImportWizardPage);
    await fixture.whenStable();
    return fixture;
  };

  const root = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;
  const heading = (fixture: ComponentFixture<unknown>) => text(root(fixture).querySelector('h2'));

  const chooseFile = async (fixture: ComponentFixture<unknown>, file: File) => {
    const input = field(fixture, 'import-file');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await settle(fixture);
  };

  const choose = async (fixture: ComponentFixture<unknown>, id: string, value: string) => {
    const select = root(fixture).querySelector<HTMLSelectElement>(`select#${id}`);
    if (!select) throw new Error(`No select #${id}`);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
  };

  const click = async (fixture: ComponentFixture<unknown>, label: string) => {
    const button = [...root(fixture).querySelectorAll<HTMLButtonElement>('button')].find((b) => text(b) === label);
    if (!button) throw new Error(`No button "${label}"`);
    button.click();
    await settle(fixture);
  };

  const enterprise = (fixture: ComponentFixture<unknown>, column: string) => {
    const row = root(fixture).querySelector<HTMLElement>(`[data-column="${column}"]`);
    if (!row) throw new Error(`No enterprise row ${column}`);
    return row;
  };

  const toggle = async (fixture: ComponentFixture<unknown>, column: string) => {
    enterprise(fixture, column).querySelector<HTMLElement>('[role="checkbox"]')?.click();
    await settle(fixture);
  };

  /** Upload, preview answered, city mapped, "Next": the enterprises step. */
  const toEnterprisesStep = async () => {
    const fixture = await render();
    await chooseFile(fixture, new File(['PK'], 'Sales 2025.xlsx', { type: XLSX }));
    http.expectOne({ method: 'POST', url: '/api/imports/preview' }).flush(PREVIEW);
    await settle(fixture);
    await choose(fixture, 'import-field-city', 'Comune');
    await click(fixture, 'Next');
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImportWizardPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('step 1: upload (US-01, US-02)', () => {
    it('starts with the upload step and offers the template', async () => {
      const fixture = await render();

      expect(text(root(fixture).querySelector('h1'))).toBe('New import');
      expect(heading(fixture)).toBe('Upload the file');
      expect(text(root(fixture).querySelector('[aria-current="step"]'))).toContain('Upload');
      const template = root(fixture).querySelector<HTMLAnchorElement>('a[href="/api/imports/template"]');
      expect(template?.hasAttribute('download')).toBe(true);
    });

    it('refuses a file that is not an .xlsx without uploading it', async () => {
      const fixture = await render();

      await chooseFile(fixture, new File(['a;b'], 'data.csv', { type: 'text/csv' }));

      http.expectNone('/api/imports/preview');
      expect(text(root(fixture).querySelector('#import-error'))).toContain('Choose an Excel workbook (.xlsx)');
      expect(heading(fixture)).toBe('Upload the file');
    });

    it('explains a file the server cannot read', async () => {
      const fixture = await render();
      await chooseFile(fixture, new File(['PK'], 'broken.xlsx', { type: XLSX }));

      http
        .expectOne('/api/imports/preview')
        .flush({ detail: 'The file is not a valid Excel workbook (.xlsx)' }, { status: 422, statusText: 'Unprocessable' });
      await settle(fixture);

      expect(text(root(fixture).querySelector('#import-error'))).toContain('The file is not a valid Excel workbook');
      expect(heading(fixture)).toBe('Upload the file');
    });
  });

  describe('step 2: columns (US-03, US-04)', () => {
    it('shows the first rows and the suggested column of each field', async () => {
      const fixture = await render();
      await chooseFile(fixture, new File(['PK'], 'Sales 2025.xlsx', { type: XLSX }));
      http.expectOne({ method: 'POST', url: '/api/imports/preview' }).flush(PREVIEW);
      await settle(fixture);

      expect(heading(fixture)).toBe('Map the columns');
      const table = root(fixture).querySelector('table');
      expect(text(table?.querySelector('caption'))).toContain('First 2 of 3 rows of sheet Sheet1');
      expect([...(table?.querySelectorAll('th') ?? [])].map(text)).toEqual(PREVIEW.headers);
      expect(text(table?.querySelector('tbody td'))).toBe('ACME SRL');
      expect(root(fixture).querySelector<HTMLSelectElement>('select#import-field-customer')?.value).toBe('Ragione Sociale');
      expect(root(fixture).querySelector<HTMLSelectElement>('select#import-field-city')?.value).toBe('');
    });

    it('needs the required columns before going on', async () => {
      const fixture = await render();
      await chooseFile(fixture, new File(['PK'], 'Sales 2025.xlsx', { type: XLSX }));
      http.expectOne('/api/imports/preview').flush(PREVIEW);
      await settle(fixture);

      await click(fixture, 'Next');

      expect(heading(fixture)).toBe('Map the columns');
      expect(text(root(fixture))).toContain('Choose the column with the city');
    });

    it('needs latitude and longitude together', async () => {
      const fixture = await render();
      await chooseFile(fixture, new File(['PK'], 'Sales 2025.xlsx', { type: XLSX }));
      http.expectOne('/api/imports/preview').flush(PREVIEW);
      await settle(fixture);
      await choose(fixture, 'import-field-city', 'Comune');
      await choose(fixture, 'import-field-latitude', 'Lat');

      await click(fixture, 'Next');

      expect(heading(fixture)).toBe('Map the columns');
      expect(text(root(fixture))).toContain('Choose both latitude and longitude, or neither');
    });
  });

  describe('step 3: enterprises and name (US-05, US-06)', () => {
    it('offers the columns not used by a field, the suggested ones selected, and names the import after the file', async () => {
      const fixture = await toEnterprisesStep();

      expect(heading(fixture)).toBe('Enterprises and name');
      const columns = [...root(fixture).querySelectorAll<HTMLElement>('[data-column]')].map((row) => row.dataset['column']);
      expect(columns).toEqual(['Totale', 'ENTERPRISE A', 'ENTERPRISE B', 'Lat', 'Lon']);
      const checked = (column: string) =>
        enterprise(fixture, column).querySelector('[role="checkbox"]')?.getAttribute('aria-checked');
      expect(checked('ENTERPRISE A')).toBe('true');
      expect(checked('Totale')).toBe('false');
      expect(field(fixture, 'import-name').value).toBe('Sales 2025');
    });

    it('imports with the chosen enterprises and shows the report', async () => {
      const fixture = await toEnterprisesStep();
      type(enterprise(fixture, 'ENTERPRISE B').querySelector<HTMLInputElement>('input[type="text"]')!, 'Beer');
      await settle(fixture);

      await click(fixture, 'Import');
      const request = http.expectOne({ method: 'POST', url: '/api/imports' });
      const body = request.request.body as FormData;
      expect((body.get('file') as File).name).toBe('Sales 2025.xlsx');
      const sent = JSON.parse(await (body.get('request') as Blob).text());
      expect(sent.name).toBe('Sales 2025');
      expect(sent.mapping.city).toBe('Comune');
      expect(sent.mapping.enterprises).toEqual([
        { sourceColumn: 'ENTERPRISE A', name: 'ENTERPRISE A', color: '#0072b2' },
        { sourceColumn: 'ENTERPRISE B', name: 'Beer', color: '#d55e00' },
      ]);
      request.flush(SUMMARY, { status: 201, statusText: 'Created' });
      await settle(fixture);

      expect(heading(fixture)).toBe('Import saved');
      const counts = [...root(fixture).querySelectorAll('dl > div')].map(
        (pair) => `${text(pair.querySelector('dt'))}: ${text(pair.querySelector('dd'))}`,
      );
      expect(counts).toEqual(['Rows in the file: 3', 'Imported: 2', 'Skipped: 1']);
      expect(root(fixture).querySelector('a[href="/imports/7"]')).not.toBeNull();
    });

    it('needs at least one enterprise', async () => {
      const fixture = await toEnterprisesStep();
      await toggle(fixture, 'ENTERPRISE A');
      await toggle(fixture, 'ENTERPRISE B');

      await click(fixture, 'Import');

      http.expectNone('/api/imports');
      expect(text(root(fixture))).toContain('Select at least one enterprise column');
    });

    it('refuses a color too light to be seen on the map', async () => {
      const fixture = await toEnterprisesStep();
      type(enterprise(fixture, 'ENTERPRISE A').querySelector<HTMLInputElement>('input[type="color"]')!, '#ffff00');
      await settle(fixture);

      await click(fixture, 'Import');

      http.expectNone('/api/imports');
      expect(text(root(fixture))).toContain('Too light to be seen on the map');
    });

    it('needs a name for the import', async () => {
      const fixture = await toEnterprisesStep();
      type(field(fixture, 'import-name'), '   ');
      await settle(fixture);

      await click(fixture, 'Import');

      http.expectNone('/api/imports');
      expect(text(root(fixture))).toContain('Give the import a name');
    });

    it('shows why the server refused the import', async () => {
      const fixture = await toEnterprisesStep();

      await click(fixture, 'Import');
      http.expectOne('/api/imports').flush(
        { detail: 'No row of the file can be imported: check that the columns are mapped to the right fields' },
        { status: 422, statusText: 'Unprocessable' },
      );
      await settle(fixture);

      expect(heading(fixture)).toBe('Enterprises and name');
      expect(text(root(fixture).querySelector('#import-error'))).toContain('No row of the file can be imported');
    });

    it('goes back to the columns keeping the choices', async () => {
      const fixture = await toEnterprisesStep();

      await click(fixture, 'Back');

      expect(heading(fixture)).toBe('Map the columns');
      expect(root(fixture).querySelector<HTMLSelectElement>('select#import-field-city')?.value).toBe('Comune');
    });
  });
});
