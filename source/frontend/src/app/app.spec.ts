import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App, importIdFromUrl } from './app';

@Component({ template: '' })
class EmptyPage {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '**', component: EmptyPage }])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand in the header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header')?.textContent).toContain('VisitWise');
  });

  it('shows the import sections only inside an import', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    await router.navigateByUrl('/imports');
    await fixture.whenStable();
    expect(compiled.querySelector('nav[aria-label="Import 42"]')).toBeNull();

    await router.navigateByUrl('/imports/42/map');
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

describe('App skip link', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '**', component: EmptyPage }])],
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
