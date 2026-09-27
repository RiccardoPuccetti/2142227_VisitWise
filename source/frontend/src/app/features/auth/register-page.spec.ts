import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterPage } from './register-page';
import { field, settle, submit, text, type } from './form-test-utils';

const TENANT = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

describe('RegisterPage', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const render = async () => {
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    return fixture;
  };

  const fill = (fixture: Awaited<ReturnType<typeof render>>, name: string, email: string, password: string) => {
    type(field(fixture, 'register-name'), name);
    type(field(fixture, 'register-email'), email);
    type(field(fixture, 'register-password'), password);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('has labelled fields with the autocomplete hints for a new account', async () => {
    const fixture = await render();
    const page = fixture.nativeElement as HTMLElement;

    expect(text(page.querySelector('h1'))).toBe('Register');
    expect(field(fixture, 'register-name').getAttribute('autocomplete')).toBe('organization');
    expect(field(fixture, 'register-email').getAttribute('autocomplete')).toBe('email');
    expect(field(fixture, 'register-password').getAttribute('autocomplete')).toBe('new-password');
    for (const id of ['register-name', 'register-email', 'register-password']) {
      expect(page.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
    expect(text(page)).toContain('At least 8 characters');
  });

  it('checks the fields before calling the backend', async () => {
    const fixture = await render();
    fill(fixture, '', 'not-an-email', 'x'.repeat(65));

    await submit(fixture);

    const page = text(fixture.nativeElement);
    expect(page).toContain('Enter the name of your federation');
    expect(page).toContain('Enter a valid email address');
    expect(page).toContain('Use at most 64 characters');
    http.expectNone('/api/auth/register');
  });

  it('creates the tenant, logs in and opens the imports', async () => {
    const fixture = await render();
    fill(fixture, 'Demo federation', 'demo@visitwise.test', 'correct horse battery');

    await submit(fixture);
    http.expectOne('/api/auth/register').flush(TENANT, { status: 201, statusText: 'Created' });
    await settle(fixture);
    http.expectOne('/api/auth/login').flush(TENANT);
    await settle(fixture);

    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/imports');
  });

  it('shows "Email already registered" on the email field', async () => {
    const fixture = await render();
    fill(fixture, 'Demo federation', 'demo@visitwise.test', 'correct horse battery');

    await submit(fixture);
    http
      .expectOne('/api/auth/register')
      .flush({ detail: 'Email already registered' }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);

    const emailField = field(fixture, 'register-email').closest('[data-slot="field"]');
    expect(text(emailField)).toContain('Email already registered');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a password rule refused by the server on the password field', async () => {
    const fixture = await render();
    fill(fixture, 'Demo federation', 'demo@visitwise.test', 'short');

    await submit(fixture);
    http
      .expectOne('/api/auth/register')
      .flush({ detail: 'Password must be at least 8 characters' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);

    const passwordField = field(fixture, 'register-password').closest('[data-slot="field"]');
    expect(text(passwordField)).toContain('Password must be at least 8 characters');
  });

  it('links to the login page', async () => {
    const fixture = await render();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]')).not.toBeNull();
  });
});
