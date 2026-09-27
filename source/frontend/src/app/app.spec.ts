import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    auth = TestBed.inject(AuthService);
  });

  const render = async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return { fixture, header: fixture.nativeElement.querySelector('header') as HTMLElement };
  };

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand in the header', async () => {
    const { header } = await render();
    expect(header.textContent).toContain('VisitWise');
  });

  it('hides the navigation and the tenant menu when logged out', async () => {
    const { header } = await render();

    expect(header.textContent).not.toContain('Imports');
    expect(header.querySelector('button')).toBeNull();
  });

  it('shows the tenant name, a profile link and a logout button when logged in', async () => {
    auth.setCurrentTenant({ id: 1, name: 'Demo federation', email: 'demo@visitwise.test' });

    const { header } = await render();

    expect(header.textContent).toContain('Imports');
    const profile = header.querySelector<HTMLAnchorElement>('a[href="/profile"]');
    expect(profile?.textContent).toContain('Demo federation');
    expect(header.querySelector('button')?.textContent).toContain('Log out');
  });

  it('logs out and goes to the login page', async () => {
    auth.setCurrentTenant({ id: 1, name: 'Demo federation', email: 'demo@visitwise.test' });
    const logout = vi.spyOn(auth, 'logout').mockResolvedValue();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, header } = await render();

    header.querySelector('button')?.click();
    await fixture.whenStable();

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
