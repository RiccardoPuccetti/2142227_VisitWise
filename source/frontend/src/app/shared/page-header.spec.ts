import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="Sample 2025">
      <ul class="page-facts"><li>Imported on 28 Sept 2026</li></ul>
      <button actions type="button">Open the map</button>
    </app-page-header>
  `,
})
class Host {}

@Component({
  imports: [PageHeader],
  template: `<app-page-header title="Loading the import" [loading]="true" />`,
})
class LoadingHost {}

describe('PageHeader (US-38)', () => {
  const render = async () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('has one row with the title and the actions, and no breadcrumb', async () => {
    const page = await render();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Sample 2025');
    expect(page.querySelector('[data-slot="page-actions"] button')?.textContent?.trim()).toBe('Open the map');
    expect(page.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });

  it('while loading, shows a placeholder for the title and keeps the title for screen readers', async () => {
    TestBed.configureTestingModule({ imports: [LoadingHost] });
    const fixture = TestBed.createComponent(LoadingHost);
    await fixture.whenStable();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1')!;

    expect(heading.querySelector('hlm-skeleton')).not.toBeNull();
    expect(heading.querySelector('.sr-only')?.textContent?.trim()).toBe('Loading the import');
  });

  it('puts the facts of the page in a strip under the title row', async () => {
    const page = await render();

    expect(page.querySelector('[data-slot="page-description"]')?.textContent).toContain('Imported on 28 Sept 2026');
  });
});
