import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PlanParameters } from '../../core/models/api.models';
import { PlannerService } from './planner.service';

const PARAMETERS: PlanParameters = {
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
};

describe('PlannerService', () => {
  let service: PlannerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlannerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads campaign presets for the selected year', async () => {
    const result = service.campaigns(2026);
    const request = http.expectOne('/api/planning/campaigns?year=2026');
    expect(request.request.method).toBe('GET');
    request.flush([]);
    await expect(result).resolves.toEqual([]);
  });

  it('simulates and saves a plan for the current import', async () => {
    const simulation = service.simulate(42, PARAMETERS);
    const simulateRequest = http.expectOne('/api/imports/42/plans/simulate');
    expect(simulateRequest.request.method).toBe('POST');
    expect(simulateRequest.request.body).toEqual(PARAMETERS);
    simulateRequest.flush({ id: null });
    await simulation;

    const save = service.save(42, 'Christmas priority', PARAMETERS);
    const saveRequest = http.expectOne('/api/imports/42/plans');
    expect(saveRequest.request.method).toBe('POST');
    expect(saveRequest.request.body).toEqual({
      name: 'Christmas priority',
      parameters: PARAMETERS,
    });
    saveRequest.flush({ id: 7 });
    await save;
  });

  it('runs a what-if analysis over several horizons', async () => {
    const result = service.whatIf(42, { base: PARAMETERS, horizons: [20, 30, 40] });
    const request = http.expectOne('/api/imports/42/plans/what-if');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ base: PARAMETERS, horizons: [20, 30, 40] });
    request.flush({ rows: [] });
    await expect(result).resolves.toEqual({ rows: [] });
  });

  it('lists and deletes the saved scenarios of an import', async () => {
    const list = service.plans(42);
    const listRequest = http.expectOne('/api/imports/42/plans');
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([{ id: 7, name: 'Christmas priority' }]);
    await expect(list).resolves.toEqual([{ id: 7, name: 'Christmas priority' }]);

    const removal = service.deletePlan(7);
    const deleteRequest = http.expectOne('/api/plans/7');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null, { status: 204, statusText: 'No Content' });
    await removal;
  });
});
