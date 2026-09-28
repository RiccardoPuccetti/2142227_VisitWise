import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { PlanResult } from '../../core/models/api.models';

/** Saved plans read by the agent plan page (API_CONTRACT.md endpoint 16). */
@Service()
export class PlansService {
  private readonly http = inject(HttpClient);

  plan(planId: number): Promise<PlanResult> {
    return firstValueFrom(this.http.get<PlanResult>(`/api/plans/${planId}`));
  }
}
