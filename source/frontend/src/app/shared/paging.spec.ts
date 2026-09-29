import { signal } from '@angular/core';
import { createPaging, pageCount, pageOf } from './paging';

describe('paging', () => {
  const items = Array.from({ length: 120 }, (_, index) => index + 1);

  it('counts the pages and slices a 1-based page', () => {
    expect(pageCount(items.length, 50)).toBe(3);
    expect(pageCount(0, 50)).toBe(1);
    expect(pageOf(items, 1, 50)).toEqual(items.slice(0, 50));
    expect(pageOf(items, 3, 50)).toEqual(items.slice(100));
  });

  it('lists one page at a time, 50 rows by default, with the range shown', () => {
    const paging = createPaging(() => items);

    expect(paging.rows()).toEqual(items.slice(0, 50));
    expect(paging.pages()).toBe(3);
    expect(paging.range()).toBe('1–50');

    paging.goTo(3);
    expect(paging.rows()).toEqual(items.slice(100));
    expect(paging.range()).toBe('101–120');
  });

  it('starts again from the first page when the page size or the reset source changes', () => {
    const filter = signal('all');
    const paging = createPaging(() => items, filter);

    paging.goTo(2);
    paging.size.set(25);
    expect(paging.page()).toBe(1);

    paging.goTo(4);
    filter.set('rome');
    expect(paging.page()).toBe(1);
  });

  it('keeps the page when the items change without a reset, within the pages that are left', () => {
    const list = signal(items);
    const paging = createPaging(list);

    paging.goTo(3);
    list.set(items.slice(0, 80));
    expect(paging.page()).toBe(2);
    expect(paging.rows()).toEqual(items.slice(50, 80));
  });

  it('turns to the page that holds an item', () => {
    const paging = createPaging(() => items);

    paging.showIndex(74);
    expect(paging.page()).toBe(2);
    expect(paging.rows()).toContain(75);
  });

  it('shows 0 as the range of an empty list', () => {
    expect(createPaging(() => []).range()).toBe('0');
  });
});
