import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createPaging } from './paging';
import { TablePager } from './table-pager';

@Component({
  imports: [TablePager],
  template: `
    <div #scroller data-testid="scroller"></div>
    <app-table-pager [paging]="paging" idPrefix="things" label="Pages of things" [scroller]="scroller" />
  `,
})
class Host {
  readonly items = signal(Array.from({ length: 120 }, (_, index) => index + 1));
  readonly paging = createPaging(this.items);
}

describe('TablePager', () => {
  const render = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const nav = root.querySelector<HTMLElement>('nav[aria-label="Pages of things"]')!;
    const text = () => nav.textContent?.replace(/\s+/g, ' ') ?? '';
    const button = (label: string) =>
      Array.from(nav.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label)!;
    const choose = async (id: string, value: string) => {
      const select = root.querySelector<HTMLSelectElement>(`#${id}`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    return { fixture, root, text, button, choose };
  };

  it('shows the range, the page selector and previous / next', async () => {
    const { fixture, text, button } = await render();

    expect(text()).toContain('Showing 1–50 of 120');
    expect(text()).toContain('of 3');
    expect(button('Previous page').disabled).toBe(true);

    button('Next page').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.paging.page()).toBe(2);
    expect(text()).toContain('Showing 51–100 of 120');
  });

  it('jumps to a page and changes the rows per page', async () => {
    const { fixture, root, choose, button } = await render();
    const paging = fixture.componentInstance.paging;

    await choose('things-page', '3');
    expect(paging.page()).toBe(3);
    expect(button('Next page').disabled).toBe(true);

    await choose('things-page-size', '25');
    expect(paging.size()).toBe(25);
    expect(paging.page()).toBe(1);
    expect(root.querySelector<HTMLSelectElement>('#things-page')?.options.length).toBe(5);
  });

  it('scrolls the table back to its top on every page change', async () => {
    const { fixture, root, button } = await render();
    const scroller = root.querySelector<HTMLElement>('[data-testid="scroller"]')!;
    // jsdom has no layout and ignores scrollTop: give the element a plain, writable one.
    Object.defineProperty(scroller, 'scrollTop', { value: 200, writable: true });

    button('Next page').click();
    await fixture.whenStable();

    expect(scroller.scrollTop).toBe(0);
  });
});
