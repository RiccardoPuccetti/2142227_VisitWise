import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateImportRequest,
  ImportDetail,
  ImportPreview,
  ImportSummary,
} from '../../core/models/api.models';

/** Endpoint 1 (US-01): a plain link downloads it, the session cookie goes with it. */
export const IMPORT_TEMPLATE_URL = '/api/imports/template';

/**
 * Import calls (API_CONTRACT.md section 1): the wizard (endpoints 2-3), the imports list and detail (endpoints 4-6).
 * Files go as multipart form data: the browser sets the Content-Type with its boundary, so it is never set here.
 * Errors are passed on as HttpErrorResponse (show them with `problemDetail`).
 */
@Service()
export class ImportsService {
  private readonly http = inject(HttpClient);

  /** Endpoint 2: headers, first rows and suggested mapping. Nothing is saved. */
  preview(file: File): Promise<ImportPreview> {
    const body = new FormData();
    body.append('file', file);
    return firstValueFrom(this.http.post<ImportPreview>('/api/imports/preview', body));
  }

  /** Endpoint 3: the file again (it is never stored between the two calls) plus name and mapping as a JSON part. */
  create(file: File, request: CreateImportRequest): Promise<ImportSummary> {
    const body = new FormData();
    body.append('file', file);
    body.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    return firstValueFrom(this.http.post<ImportSummary>('/api/imports', body));
  }

  /** Endpoint 4 (US-10): the tenant's imports, newest first. */
  list(): Promise<ImportSummary[]> {
    return firstValueFrom(this.http.get<ImportSummary[]>('/api/imports'));
  }

  /** Endpoint 5 (US-11). */
  detail(importId: number): Promise<ImportDetail> {
    return firstValueFrom(this.http.get<ImportDetail>(`/api/imports/${importId}`));
  }

  /** Endpoint 6 (US-12): deletes the import with its points, revenues and plans. */
  remove(importId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/imports/${importId}`));
  }
}
