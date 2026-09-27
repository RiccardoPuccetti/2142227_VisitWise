import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Their 401 is an expected answer that the caller handles (wrong credentials, no session yet). */
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/me', '/api/auth/csrf', '/api/auth/register'];

/**
 * A 401 from any other API call means the session ended (expired, or logged out from another device):
 * forget it and go to the login page, which brings the user back here afterwards. The error is still rethrown.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      const sessionEnded =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        request.url.startsWith('/api/') &&
        !AUTH_ENDPOINTS.includes(request.url);
      if (sessionEnded) {
        auth.clearSession();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
