import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AnalyticsSummary,
  CampaignPreset,
  CreatePlanRequest,
  GeocodingProgress,
  PlanParameters,
  PlanResult,
  PlanSummary,
  RouteRequest,
  RouteResponse,
  SaveStartingBaseRequest,
  StartingBase,
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

  /** Endpoint 26: null when the tenant has not saved a base yet (204). */
  async startingBase(): Promise<StartingBase | null> {
    const response = await firstValueFrom(
      this.http.get<StartingBase>('/api/profile/base', { observe: 'response' }),
    );
    return response.status === 204 ? null : response.body;
  }

  saveStartingBase(request: SaveStartingBaseRequest): Promise<StartingBase> {
    return firstValueFrom(this.http.put<StartingBase>('/api/profile/base', request));
  }

  geocodingProgress(importId: number): Promise<GeocodingProgress> {
    return firstValueFrom(this.http.get<GeocodingProgress>(`/api/imports/${importId}/geocoding`));
  }

  retryGeocoding(importId: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/imports/${importId}/geocoding/retry`, null));
  }

  simulate(importId: number, parameters: PlanParameters): Promise<PlanResult> {
    return firstValueFrom(
      this.http.post<PlanResult>(`/api/imports/${importId}/plans/simulate`, parameters),
    );
  }

  route(importId: number, request: RouteRequest): Promise<RouteResponse> {
    return firstValueFrom(
      this.http.post<RouteResponse>(`/api/imports/${importId}/plans/route`, request),
    );
  }

  save(importId: number, name: string, parameters: PlanParameters): Promise<PlanSummary> {
    const request: CreatePlanRequest = { name, parameters };
    return firstValueFrom(this.http.post<PlanSummary>(`/api/imports/${importId}/plans`, request));
  }
}
