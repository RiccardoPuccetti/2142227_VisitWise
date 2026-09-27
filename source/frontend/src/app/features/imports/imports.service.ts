import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateImportRequest, ImportPreview, ImportSummary } from '../../core/models/api.models';

/** Endpoint 1 (US-01): a plain link downloads it, the session cookie goes with it. */
export const IMPORT_TEMPLATE_URL = '/api/imports/template';

/**
 * Import wizard calls (API_CONTRACT.md section 1, endpoints 2-3). Files go as multipart form data: the browser sets
 * the Content-Type with its boundary, so it is never set here. Errors are passed on as HttpErrorResponse
 * (show them with `problemDetail`).
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
}
