import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ColumnMapping, CreateImportRequest, ImportPreview, ImportSummary } from '../../core/models/api.models';
import { IMPORT_TEMPLATE_URL, ImportsService } from './imports.service';

const MAPPING: ColumnMapping = {
  customer: 'Ragione Sociale',
  deliveryPoint: 'Punto Vendita',
  address: 'Indirizzo',
  city: 'Comune',
  agent: 'Agente',
  latitude: null,
  longitude: null,
  enterprises: [{ sourceColumn: 'ENTERPRISE A', name: 'Wine', color: '#0072B2' }],
};

const PREVIEW: ImportPreview = {
  fileName: 'erp.xlsx',
  sheetName: 'Sheet1',
  headers: ['Ragione Sociale', 'Punto Vendita', 'Indirizzo', 'Comune', 'Agente', 'ENTERPRISE A'],
  sampleRows: [['ACME SRL', 'BAR ACME', 'VIA DEL CORSO 300', 'ROMA', 'AGENT NORTH', '1250.5']],
  totalRows: 1,
  suggestedMapping: MAPPING,
};

const SUMMARY: ImportSummary = {
  id: 7,
  name: 'Sample 2025',
  sourceFileName: 'erp.xlsx',
  createdAt: '2026-09-28T10:15:00Z',
  status: 'READY',
  totalRows: 1,
  importedRows: 1,
  skippedRows: 0,
  geocodedRows: 0,
  enterprises: [{ id: 21, name: 'Wine', color: '#0072B2', sourceColumn: 'ENTERPRISE A' }],
};

/** Lets the next awaited step of an async method run. */
const nextTick = () => new Promise((resolve) => setTimeout(resolve));

function xlsx(name = 'erp.xlsx'): File {
  return new File(['PK fake workbook'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ImportsService', () => {
  let service: ImportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ImportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('downloads the template from the relative API URL', () => {
    expect(IMPORT_TEMPLATE_URL).toBe('/api/imports/template');
  });

  it('uploads the file as multipart form data for the preview', async () => {
    const file = xlsx();
    const result = service.preview(file);

    const request = http.expectOne({ method: 'POST', url: '/api/imports/preview' });
    const body = request.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('erp.xlsx');
    // The browser writes the multipart Content-Type with its boundary: it must not be set by hand.
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(PREVIEW);

    expect(await result).toEqual(PREVIEW);
  });

  it('sends the file and the request as a JSON part to create the import', async () => {
    const request: CreateImportRequest = { name: 'Sample 2025', mapping: MAPPING };
    const result = service.create(xlsx(), request);

    const call = http.expectOne({ method: 'POST', url: '/api/imports' });
    const body = call.request.body as FormData;
    expect((body.get('file') as File).name).toBe('erp.xlsx');
    const part = body.get('request') as Blob;
    expect(part.type).toBe('application/json');
    expect(JSON.parse(await part.text())).toEqual(request);
    expect(call.request.headers.has('Content-Type')).toBe(false);
    call.flush(SUMMARY, { status: 201, statusText: 'Created' });

    expect(await result).toEqual(SUMMARY);
  });

  it('passes API errors on to the page', async () => {
    const result = service.preview(xlsx());
    const failure = expect(result).rejects.toMatchObject({ status: 422 });

    http
      .expectOne('/api/imports/preview')
      .flush({ status: 422, detail: 'The file is not a valid Excel workbook (.xlsx)' }, { status: 422, statusText: 'Unprocessable Content' });
    await nextTick();

    await failure;
  });
});
