import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPage } from './login-page';
import { field, settle, submit, text, type } from './form-test-utils';

const TENANT = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

describe('LoginPage', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const render = async (returnUrl?: string) => {
    const fixture = TestBed.createComponent(LoginPage);
    if (returnUrl !== undefined) fixture.componentRef.setInput('returnUrl', returnUrl);
    await fixture.whenStable();
    return fixture;
  };

  const fillAndSubmit = async (fixture: Awaited<ReturnType<typeof render>>) => {
    type(field(fixture, 'login-email'), 'demo@visitwise.test');
    type(field(fixture, 'login-password'), 'correct horse battery');
    await submit(fixture);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('has labelled email and password fields that password managers recognise', async () => {
    const fixture = await render();
    const page = fixture.nativeElement as HTMLElement;

    expect(text(page.querySelector('h1'))).toBe('Log in');
    expect(field(fixture, 'login-email').getAttribute('autocomplete')).toBe('username');
    expect(field(fixture, 'login-email').type).toBe('email');
    expect(field(fixture, 'login-password').getAttribute('autocomplete')).toBe('current-password');
    expect(page.querySelector('label[for="login-email"]')).not.toBeNull();
    expect(page.querySelector('label[for="login-password"]')).not.toBeNull();
  });

  it('asks for the missing fields without calling the backend', async () => {
    const fixture = await render();

    await submit(fixture);

    const errors = text(fixture.nativeElement);
    expect(errors).toContain('Enter your email');
    expect(errors).toContain('Enter your password');
    http.expectNone('/api/auth/login');
  });

  it('logs in and goes back to the page that was asked for', async () => {
    const fixture = await render('/imports/3/map');

    await fillAndSubmit(fixture);
    http.expectOne('/api/auth/login').flush(TENANT);
    await settle(fixture);

    expect(TestBed.inject(AuthService).currentTenant()).toEqual(TENANT);
    expect(navigate).toHaveBeenCalledWith('/imports/3/map');
  });

  it('ignores a returnUrl that points to another site', async () => {
    const fixture = await render('https://evil.example');

    await fillAndSubmit(fixture);
    http.expectOne('/api/auth/login').flush(TENANT);
    await settle(fixture);

    expect(navigate).toHaveBeenCalledWith('/imports');
  });

  it.each([
    [401, 'Invalid email or password'],
    [429, 'Too many attempts, try again later'],
  ])('shows the server message of a %s answer', async (status, detail) => {
    const fixture = await render();

    await fillAndSubmit(fixture);
    http.expectOne('/api/auth/login').flush({ detail }, { status, statusText: 'Error' });
    await settle(fixture);

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"][data-slot="alert"]');
    expect(text(alert)).toContain(detail);
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('keep me logged in (US-37)', () => {
    const checkbox = (fixture: Awaited<ReturnType<typeof render>>) =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#login-remember-me [role="checkbox"], [role="checkbox"]#login-remember-me');

    it('is offered unticked, with a label', async () => {
      const fixture = await render();

      expect(checkbox(fixture)?.getAttribute('aria-checked')).toBe('false');
      expect(text((fixture.nativeElement as HTMLElement).querySelector('label[for="login-remember-me"]'))).toBe(
        'Keep me logged in on this device',
      );
    });

    it('is not sent unless ticked', async () => {
      const fixture = await render();

      await fillAndSubmit(fixture);

      const request = http.expectOne('/api/auth/login');
      expect(request.request.body.toString()).not.toContain('remember-me');
      request.flush(TENANT);
      await settle(fixture);
    });

    it('asks to stay logged in when ticked', async () => {
      const fixture = await render();
      checkbox(fixture)?.click();
      await settle(fixture);

      await fillAndSubmit(fixture);

      const request = http.expectOne('/api/auth/login');
      expect(request.request.body.toString()).toContain('remember-me=true');
      request.flush(TENANT);
      await settle(fixture);
    });
  });

  it('can show and hide the password', async () => {
    const fixture = await render();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-controls="login-password"]',
    )!;

    expect(field(fixture, 'login-password').type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    await fixture.whenStable();

    expect(field(fixture, 'login-password').type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('links to the registration page', async () => {
    const fixture = await render();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/register"]')).not.toBeNull();
  });
});
