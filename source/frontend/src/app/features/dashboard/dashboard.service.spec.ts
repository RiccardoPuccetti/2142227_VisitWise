import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the delivery points of an import', async () => {
    const result = service.points(42);
    http.expectOne({ method: 'GET', url: '/api/imports/42/points' }).flush([]);
    expect(await result).toEqual([]);
  });

  it('reads the summary without filters', async () => {
    const result = service.summary(42, { enterpriseIds: [], agent: null });
    const request = http.expectOne((r) => r.url === '/api/imports/42/analytics/summary');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ totalRevenue: 0 });
    expect(await result).toEqual({ totalRevenue: 0 });
  });

  it('sends enterprise ids comma-separated and the agent', async () => {
    const result = service.summary(42, { enterpriseIds: [21, 23], agent: 'AGENT NORTH' });
    const request = http.expectOne((r) => r.url === '/api/imports/42/analytics/summary');
    expect(request.request.params.get('enterpriseIds')).toBe('21,23');
    expect(request.request.params.get('agents')).toBe('AGENT NORTH');
    request.flush({});
    await result;
  });
});
