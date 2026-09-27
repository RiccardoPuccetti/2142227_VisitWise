import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CurrentTenant } from '../models/api.models';
import { AuthService } from './auth.service';

const TENANT: CurrentTenant = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

/** Lets the next awaited step of an async method run. */
const nextTick = () => new Promise((resolve) => setTimeout(resolve));

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts logged out', () => {
    expect(service.currentTenant()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  describe('loadSession', () => {
    it('gets the CSRF cookie first, then the current tenant', async () => {
      const done = service.loadSession();
      http.expectOne({ method: 'GET', url: '/api/auth/csrf' }).flush(null, { status: 204, statusText: 'No Content' });
      await nextTick();
      http.expectOne({ method: 'GET', url: '/api/auth/me' }).flush(TENANT);
      await done;

      expect(service.currentTenant()).toEqual(TENANT);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('stays logged out without an error when there is no session', async () => {
      const done = service.loadSession();
      http.expectOne('/api/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
      await nextTick();
      http.expectOne('/api/auth/me').flush({ status: 401 }, { status: 401, statusText: 'Unauthorized' });
      await done;

      expect(service.isLoggedIn()).toBe(false);
    });

    it('stays logged out without an error when the backend is down', async () => {
      const done = service.loadSession();
      http.expectOne('/api/auth/csrf').error(new ProgressEvent('error'));
      await done;

      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('login', () => {
    it('posts the credentials form-encoded, as Spring Security expects', async () => {
      const done = service.login('demo@visitwise.test', 'p@ss word&=1');
      const request = http.expectOne({ method: 'POST', url: '/api/auth/login' });
      expect(request.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
      expect(request.request.body.toString()).toBe('username=demo%40visitwise.test&password=p%40ss%20word%26%3D1');
      request.flush(TENANT);

      expect(await done).toEqual(TENANT);
      expect(service.currentTenant()).toEqual(TENANT);
    });

    it('stays logged out and rejects when the credentials are wrong', async () => {
      const done = service.login('demo@visitwise.test', 'wrong');
      http.expectOne('/api/auth/login').flush(
        { detail: 'Invalid email or password' },
        { status: 401, statusText: 'Unauthorized' },
      );

      await expect(done).rejects.toBeTruthy();
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  it('register creates the tenant, then logs in with the same credentials', async () => {
    const done = service.register({
      tenantName: 'Demo federation',
      email: 'demo@visitwise.test',
      password: 'correct horse battery',
    });
    const register = http.expectOne({ method: 'POST', url: '/api/auth/register' });
    expect(register.request.body).toEqual({
      tenantName: 'Demo federation',
      email: 'demo@visitwise.test',
      password: 'correct horse battery',
    });
    register.flush(TENANT, { status: 201, statusText: 'Created' });
    await nextTick();
    http.expectOne({ method: 'POST', url: '/api/auth/login' }).flush(TENANT);

    expect(await done).toEqual(TENANT);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('logout ends the session, then gets a fresh CSRF cookie for the next login', async () => {
    service.setCurrentTenant(TENANT);

    const done = service.logout();
    http.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush(null, { status: 204, statusText: 'No Content' });
    await nextTick();
    http.expectOne({ method: 'GET', url: '/api/auth/csrf' }).flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(service.isLoggedIn()).toBe(false);
  });

  it('clearSession forgets the tenant without calling the backend', () => {
    service.setCurrentTenant(TENANT);

    service.clearSession();

    expect(service.isLoggedIn()).toBe(false);
  });
});
