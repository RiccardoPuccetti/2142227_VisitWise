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

  it('puts the facts of the page in a strip under the title row', async () => {
    const page = await render();

    expect(page.querySelector('[data-slot="page-description"]')?.textContent).toContain('Imported on 28 Sept 2026');
  });
});
