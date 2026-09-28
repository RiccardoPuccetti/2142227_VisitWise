import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParameterCodec, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CurrentTenant, RegisterRequest } from '../models/api.models';

/**
 * Angular's default codec leaves characters such as `@ = ? /` unescaped (fine in URLs); passwords can contain
 * anything, so every reserved character is escaped in the login form body.
 */
const STRICT_FORM_ENCODING: HttpParameterCodec = {
  encodeKey: encodeURIComponent,
  encodeValue: encodeURIComponent,
  decodeKey: decodeURIComponent,
  decodeValue: decodeURIComponent,
};

/**
 * Session of the logged-in tenant (API_CONTRACT.md section 4, AUTHENTICATION.md).
 * The session itself is an HttpOnly cookie the app cannot read: this service only mirrors who is logged in.
 * CSRF: Angular's HttpClient sends the XSRF-TOKEN cookie back in X-XSRF-TOKEN on POST/PUT/PATCH/DELETE by itself.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tenant = signal<CurrentTenant | null>(null);

  readonly currentTenant = this.tenant.asReadonly();
  readonly isLoggedIn = computed(() => this.tenant() !== null);

  /** At startup: get the CSRF cookie, then ask who is logged in. Never throws: no session = logged out. */
  async loadSession(): Promise<void> {
    try {
      await firstValueFrom(this.http.get<void>('/api/auth/csrf'));
      this.tenant.set(await firstValueFrom(this.http.get<CurrentTenant>('/api/auth/me')));
    } catch {
      this.tenant.set(null);
    }
  }

  /** Spring Security form login: form-encoded `username` (the email) and `password`. */
  /** `rememberMe` (US-37): the backend keeps this device logged in for 14 days with an HttpOnly cookie. */
  async login(email: string, password: string, rememberMe = false): Promise<CurrentTenant> {
    let body = new HttpParams({ encoder: STRICT_FORM_ENCODING })
      .set('username', email)
      .set('password', password);
    if (rememberMe) {
      body = body.set('remember-me', 'true');
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const tenant = await firstValueFrom(this.http.post<CurrentTenant>('/api/auth/login', body, { headers }));
    this.tenant.set(tenant);
    return tenant;
  }

  /** Registration does not open a session: log in right after with the same credentials. */
  async register(request: RegisterRequest): Promise<CurrentTenant> {
    await firstValueFrom(this.http.post<CurrentTenant>('/api/auth/register', request));
    return this.login(request.email, request.password);
  }

  /** The backend deletes the CSRF cookie on logout: get a new one so the next login works. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>('/api/auth/logout', null));
    } finally {
      this.tenant.set(null);
      await firstValueFrom(this.http.get<void>('/api/auth/csrf')).catch(() => undefined);
    }
  }

  /** The session ended on the server (e.g. expired): forget it locally. */
  clearSession(): void {
    this.tenant.set(null);
  }

  /** After a profile change the backend returns the updated tenant. */
  setCurrentTenant(tenant: CurrentTenant): void {
    this.tenant.set(tenant);
  }
}
