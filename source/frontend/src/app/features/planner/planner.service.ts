import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AnalyticsSummary,
  CampaignPreset,
  CreatePlanRequest,
  PlanParameters,
  PlanResult,
  PlanSummary,
} from '../../core/models/api.models';

/** API calls used by the MAR-4 planner page. */
@Service()
export class PlannerService {
  private readonly http = inject(HttpClient);

  campaigns(year: number): Promise<CampaignPreset[]> {
    return firstValueFrom(
      this.http.get<CampaignPreset[]>('/api/planning/campaigns', { params: { year } }),
    );
  }

  options(importId: number): Promise<AnalyticsSummary> {
    return firstValueFrom(
      this.http.get<AnalyticsSummary>(`/api/imports/${importId}/analytics/summary`),
    );
  }

  simulate(importId: number, parameters: PlanParameters): Promise<PlanResult> {
    return firstValueFrom(
      this.http.post<PlanResult>(`/api/imports/${importId}/plans/simulate`, parameters),
    );
  }

  save(importId: number, name: string, parameters: PlanParameters): Promise<PlanSummary> {
    const request: CreatePlanRequest = { name, parameters };
    return firstValueFrom(this.http.post<PlanSummary>(`/api/imports/${importId}/plans`, request));
  }
}
