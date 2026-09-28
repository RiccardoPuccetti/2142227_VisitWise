import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

@Component({ template: '' })
class DummyPage {}

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'imports/:importId', component: DummyPage },
          { path: 'login', component: DummyPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    await router.navigateByUrl('/imports/3');
    auth.setCurrentTenant({ id: 1, name: 'Demo federation', email: 'demo@visitwise.test' });
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  const call = (url: string, status: { status: number; statusText: string }) => {
    const response = firstValueFrom(http.get(url));
    httpMock.expectOne(url).flush({}, status);
    return response;
  };

  it('on 401 from an API call, forgets the session and goes to login with the current page as returnUrl', async () => {
    await expect(call('/api/imports', UNAUTHORIZED)).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/imports/3' } });
  });

  it.each(['/api/auth/login', '/api/auth/me', '/api/auth/csrf', '/api/auth/register'])(
    'leaves a 401 from %s to the caller (no redirect)',
    async (url) => {
      await expect(call(url, UNAUTHORIZED)).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(navigate).not.toHaveBeenCalled();
      expect(auth.isLoggedIn()).toBe(true);
    },
  );

  it('does not react to other errors', async () => {
    await expect(call('/api/imports', { status: 500, statusText: 'Server Error' })).rejects.toBeInstanceOf(
      HttpErrorResponse,
    );

    expect(navigate).not.toHaveBeenCalled();
    expect(auth.isLoggedIn()).toBe(true);
  });
});
