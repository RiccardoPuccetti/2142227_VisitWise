import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App, importIdFromUrl, tenantInitials } from './app';
import { AuthService } from './core/auth/auth.service';
import { SIDEBAR_STORAGE_KEY } from './core/layout/sidebar-preference';

@Component({ template: '' })
class EmptyPage {}

const TENANT = { id: 1, name: 'Demo federation', email: 'demo@visitwise.test' };

const PROVIDERS = [
  provideRouter([{ path: '**', component: EmptyPage }]),
  provideHttpClient(),
  provideHttpClientTesting(),
];

describe('App', () => {
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: PROVIDERS,
    }).compileComponents();
    auth = TestBed.inject(AuthService);
  });

  const render = async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return { fixture, header: fixture.nativeElement.querySelector('header') as HTMLElement };
  };

  const buttonNamed = (header: HTMLElement, name: string) =>
    [...header.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === name || button.getAttribute('aria-label') === name,
    );

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand in the header', async () => {
    const { header } = await render();
    expect(header.textContent).toContain('VisitWise');
  });

  describe('theme toggle (US-36)', () => {
    const toggle = (header: HTMLElement) =>
      [...header.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === 'Dark mode');

    beforeEach(() => {
      localStorage.clear();
      document.documentElement.classList.remove('dark');
      window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
    });

    it('is in the header even before login, and says whether dark mode is on', async () => {
      const { header } = await render();

      expect(toggle(header)?.getAttribute('aria-pressed')).toBe('false');
    });

    it('switches the whole interface to dark and back', async () => {
      const { fixture, header } = await render();

      toggle(header)?.click();
      await fixture.whenStable();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(toggle(header)?.getAttribute('aria-pressed')).toBe('true');

      toggle(header)?.click();
      await fixture.whenStable();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('hides the navigation and the tenant menu when logged out', async () => {
    const { header } = await render();

    expect(header.querySelector('nav')).toBeNull();
    const buttons = [...header.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).not.toContain('Log out');
  });

  it('shows the tenant name, a profile link and a logout button when logged in', async () => {
    auth.setCurrentTenant(TENANT);

    const { header } = await render();

    expect(header.querySelector('nav[aria-label="Main"]')?.textContent).toContain('Imports');
    const profile = header.querySelector<HTMLAnchorElement>('a[href="/profile"]');
    expect(profile?.textContent).toContain('Demo federation');
    expect(buttonNamed(header, 'Log out')).toBeDefined();
  });

  it('shows the initials of the federation next to its name (US-38)', async () => {
    auth.setCurrentTenant(TENANT);

    const { header } = await render();

    const initials = header.querySelector('a[href="/profile"] [data-testid="initials"]');
    expect(initials?.textContent?.trim()).toBe('DF');
    expect(initials?.getAttribute('aria-hidden')).toBe('true');
  });

  it('logs out and goes to the login page', async () => {
    auth.setCurrentTenant(TENANT);
    const logout = vi.spyOn(auth, 'logout').mockResolvedValue();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, header } = await render();

    buttonNamed(header, 'Log out')?.click();
    await fixture.whenStable();

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  describe('sidebar (US-38)', () => {
    beforeEach(() => {
      localStorage.clear();
      auth.setCurrentTenant(TENANT);
    });
    afterEach(() => localStorage.clear());

    it('collapses to icons and remembers it, keeping the link names for screen readers', async () => {
      const { fixture, header } = await render();
      const toggle = buttonNamed(header, 'Collapse sidebar')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      toggle.click();
      await fixture.whenStable();

      expect(header.getAttribute('data-collapsed')).toBe('true');
      expect(buttonNamed(header, 'Expand sidebar')?.getAttribute('aria-expanded')).toBe('false');
      expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed');
      const imports = header.querySelector<HTMLAnchorElement>('nav[aria-label="Main"] a[href="/imports"]');
      expect(imports?.textContent?.trim()).toBe('Imports');
    });

    it('shows the name of the open import above its sections', async () => {
      const fixture = TestBed.createComponent(App);
      const http = TestBed.inject(HttpTestingController);
      await TestBed.inject(Router).navigateByUrl('/imports/42/map');
      TestBed.tick();
      http.expectOne('/api/imports/42').flush({ id: 42, name: 'Sample 2025' });
      await fixture.whenStable();

      const header = (fixture.nativeElement as HTMLElement).querySelector('header')!;
      expect(header.querySelector('[data-testid="import-name"]')?.textContent?.trim()).toBe('Sample 2025');
    });
  });

  it('shows the import sections only inside an import', async () => {
    auth.setCurrentTenant(TENANT);
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    await router.navigateByUrl('/imports');
    await fixture.whenStable();
    expect(compiled.querySelector('nav[aria-label="Import 42"]')).toBeNull();

    await router.navigateByUrl('/imports/42/map');
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/imports/42').flush({ id: 42, name: 'Sample 2025' });
    await fixture.whenStable();
    const importNav = compiled.querySelector('nav[aria-label="Import 42"]');
    const links = Array.from(importNav?.querySelectorAll('a') ?? []);
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Overview',
      'Map',
      'Planner',
      'Scenarios',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/imports/42',
      '/imports/42/map',
      '/imports/42/planner',
      '/imports/42/scenarios',
    ]);
    expect(links.find((a) => a.getAttribute('aria-current') === 'page')?.textContent?.trim()).toBe(
      'Map',
    );
  });
});

describe('importIdFromUrl', () => {
  it('reads the id of an import page', () => {
    expect(importIdFromUrl('/imports/42')).toBe(42);
    expect(importIdFromUrl('/imports/42/plans/7')).toBe(42);
    expect(importIdFromUrl('/imports/42?tab=points')).toBe(42);
  });

  it('returns null outside an import', () => {
    expect(importIdFromUrl('/imports')).toBeNull();
    expect(importIdFromUrl('/imports/new')).toBeNull();
    expect(importIdFromUrl('/')).toBeNull();
  });
});

describe('tenantInitials (US-38)', () => {
  it('takes the first letter of the first two words', () => {
    expect(tenantInitials('Demo federation')).toBe('DF');
    expect(tenantInitials('  federazione   vini  del Lazio ')).toBe('FV');
  });

  it('uses one letter for a one-word name and a placeholder for an empty one', () => {
    expect(tenantInitials('Acme')).toBe('A');
    expect(tenantInitials('   ')).toBe('?');
  });
});

describe('App skip link', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: PROVIDERS,
    }).compileComponents();
  });

  it('moves the focus to the main content without navigating', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/imports/42/map');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    document.body.appendChild(compiled);

    const skip = compiled.querySelector<HTMLAnchorElement>('a[href="#main"]')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('main');
    expect(router.url).toBe('/imports/42/map');
    compiled.remove();
  });
});
