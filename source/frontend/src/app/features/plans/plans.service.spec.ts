import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { PlanResult } from '../../core/models/api.models';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  let service: PlansService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlansService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads a saved plan', async () => {
    const plan = { id: 3, name: 'Christmas' } as PlanResult;

    const result = service.plan(3);
    const request = http.expectOne('/api/plans/3');
    expect(request.request.method).toBe('GET');
    request.flush(plan);

    expect(await result).toEqual(plan);
  });
});
