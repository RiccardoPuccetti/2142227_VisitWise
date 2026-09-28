import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guards';

const TENANT = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

describe('auth guards', () => {
  let auth: AuthService;
  let router: Router;

  const run = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('lets a logged-in tenant through', () => {
      auth.setCurrentTenant(TENANT);

      expect(run(authGuard, '/imports/3/map')).toBe(true);
    });

    it('sends a logged-out visitor to the login page, remembering where they were going', () => {
      const result = run(authGuard, '/imports/3/map?agent=A');

      expect(result).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fimports%2F3%2Fmap%3Fagent%3DA');
    });
  });

  describe('guestGuard', () => {
    it('shows the login and register pages to a logged-out visitor', () => {
      expect(run(guestGuard, '/login')).toBe(true);
    });

    it('sends a logged-in tenant to the imports list', () => {
      auth.setCurrentTenant(TENANT);

      const result = run(guestGuard, '/login');

      expect(router.serializeUrl(result as UrlTree)).toBe('/imports');
    });
  });
});
