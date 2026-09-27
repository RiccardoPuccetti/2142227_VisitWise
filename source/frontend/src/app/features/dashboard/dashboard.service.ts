import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AnalyticsSummary, DeliveryPoint } from '../../core/models/api.models';

/** Filters the summary endpoint understands (the others are applied on the map only). */
export interface SummaryFilter {
  enterpriseIds: number[];
  agent: string | null;
}

/** Read API of the map dashboard (API_CONTRACT.md endpoints 7 and 10). */
@Service()
export class DashboardService {
  private readonly http = inject(HttpClient);

  points(importId: number): Promise<DeliveryPoint[]> {
    return firstValueFrom(this.http.get<DeliveryPoint[]>(`/api/imports/${importId}/points`));
  }

  summary(importId: number, filter: SummaryFilter): Promise<AnalyticsSummary> {
    let params = new HttpParams();
    if (filter.enterpriseIds.length) {
      params = params.set('enterpriseIds', filter.enterpriseIds.join(','));
    }
    if (filter.agent) {
      params = params.set('agents', filter.agent);
    }
    return firstValueFrom(
      this.http.get<AnalyticsSummary>(`/api/imports/${importId}/analytics/summary`, { params }),
    );
  }
}
