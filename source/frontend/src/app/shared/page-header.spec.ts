import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader, type Crumb } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header [trail]="trail" title="Sample 2025">
      <p>Imported on 28 Sept 2026 from sample-erp-layout.xlsx</p>
      <button actions type="button">Open the map</button>
    </app-page-header>
  `,
})
class Host {
  trail: Crumb[] = [{ label: 'Imports', link: '/imports' }];
}

describe('PageHeader (US-38)', () => {
  const render = async () => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows where the page is: a breadcrumb up to the current page, which is the title', async () => {
    const page = await render();

    const breadcrumb = page.querySelector('nav[aria-label="Breadcrumb"]');
    const imports = breadcrumb?.querySelector<HTMLAnchorElement>('a[href="/imports"]');
    expect(imports?.textContent?.trim()).toBe('Imports');
    const current = breadcrumb?.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Sample 2025');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Sample 2025');
  });

  it('puts the description under the title and the actions beside it', async () => {
    const page = await render();

    expect(page.querySelector('[data-slot="page-description"]')?.textContent).toContain('Imported on 28 Sept 2026');
    expect(page.querySelector('[data-slot="page-actions"] button')?.textContent?.trim()).toBe('Open the map');
  });

  it('has no breadcrumb on a top-level page', async () => {
    TestBed.configureTestingModule({ imports: [PageHeader], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Imports');
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Imports');
  });
});
