import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { field, settle, submit, text, type } from '../auth/form-test-utils';
import { ProfilePage } from './profile-page';

const TENANT = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

describe('ProfilePage', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  const render = async () => {
    const fixture = TestBed.createComponent(ProfilePage);
    await fixture.whenStable();
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setCurrentTenant(TENANT);
  });

  afterEach(() => http.verify());

  it('shows the tenant name ready to edit and the login email', async () => {
    const fixture = await render();

    expect(text((fixture.nativeElement as HTMLElement).querySelector('h1'))).toBe('Profile');
    expect(field(fixture, 'profile-name').value).toBe('Demo federation');
    expect(text(fixture.nativeElement)).toContain('demo@visitwise.test');
  });

  describe('tenant name', () => {
    it('saves the new name and updates the header', async () => {
      const fixture = await render();
      type(field(fixture, 'profile-name'), 'Renamed federation');

      await submit(fixture, 'form[aria-labelledby="profile-name-title"]');
      const request = http.expectOne({ method: 'PATCH', url: '/api/profile' });
      expect(request.request.body).toEqual({ name: 'Renamed federation' });
      request.flush({ ...TENANT, name: 'Renamed federation' });
      await settle(fixture);

      expect(auth.currentTenant()?.name).toBe('Renamed federation');
      expect(text(fixture.nativeElement)).toContain('Name saved');
    });

    it('does not save a blank name', async () => {
      const fixture = await render();
      type(field(fixture, 'profile-name'), '   ');

      await submit(fixture, 'form[aria-labelledby="profile-name-title"]');

      expect(text(fixture.nativeElement)).toContain('Enter the name of your federation');
      http.expectNone('/api/profile');
    });
  });

  describe('password', () => {
    const PASSWORD_FORM = 'form[aria-labelledby="profile-password-title"]';

    const fillPasswords = (fixture: Awaited<ReturnType<typeof render>>, current: string, next: string) => {
      type(field(fixture, 'profile-current-password'), current);
      type(field(fixture, 'profile-new-password'), next);
    };

    it('uses the autocomplete hints for a password change', async () => {
      const fixture = await render();

      expect(field(fixture, 'profile-current-password').getAttribute('autocomplete')).toBe('current-password');
      expect(field(fixture, 'profile-new-password').getAttribute('autocomplete')).toBe('new-password');
    });

    it('changes the password, clears the fields and says the other devices were logged out', async () => {
      const fixture = await render();
      fillPasswords(fixture, 'correct horse battery', 'a brand new passphrase');

      await submit(fixture, PASSWORD_FORM);
      const request = http.expectOne({ method: 'PUT', url: '/api/profile/password' });
      expect(request.request.body).toEqual({
        currentPassword: 'correct horse battery',
        newPassword: 'a brand new passphrase',
      });
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(text(fixture.nativeElement)).toContain('Password changed. Other devices have been logged out.');
      expect(field(fixture, 'profile-current-password').value).toBe('');
      expect(field(fixture, 'profile-new-password').value).toBe('');
    });

    it('shows a wrong current password on its field', async () => {
      const fixture = await render();
      fillPasswords(fixture, 'not my password', 'a brand new passphrase');

      await submit(fixture, PASSWORD_FORM);
      http
        .expectOne('/api/profile/password')
        .flush({ detail: 'Current password is incorrect' }, { status: 400, statusText: 'Bad Request' });
      await settle(fixture);

      const currentField = field(fixture, 'profile-current-password').closest('[data-slot="field"]');
      expect(text(currentField)).toContain('Current password is incorrect');
    });

    it('shows a password rule refused by the server on the new password field', async () => {
      const fixture = await render();
      fillPasswords(fixture, 'correct horse battery', 'short');

      await submit(fixture, PASSWORD_FORM);
      http
        .expectOne('/api/profile/password')
        .flush({ detail: 'Password must be at least 8 characters' }, { status: 400, statusText: 'Bad Request' });
      await settle(fixture);

      const newField = field(fixture, 'profile-new-password').closest('[data-slot="field"]');
      expect(text(newField)).toContain('Password must be at least 8 characters');
    });

    it('asks for both passwords', async () => {
      const fixture = await render();

      await submit(fixture, PASSWORD_FORM);

      const page = text(fixture.nativeElement);
      expect(page).toContain('Enter your current password');
      expect(page).toContain('Enter a new password');
      http.expectNone('/api/profile/password');
    });
  });
});
