import { HttpErrorResponse } from '@angular/common/http';

/**
 * A message for the user from a failed API call. The backend answers with RFC 9457 problem+json, whose `detail`
 * is written for people (e.g. "Email already registered"); anything else gets a generic message.
 */
export function problemDetail(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    if (error.status === 413) {
      // Refused by nginx before the backend, with an HTML page: uploads are limited to 20 MB.
      return 'The file is too large: the limit is 20 MB.';
    }
    const detail: unknown = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
  }
  return 'Something went wrong. Please try again.';
}
