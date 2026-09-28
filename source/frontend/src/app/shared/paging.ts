import { computed, linkedSignal, Signal, signal, WritableSignal } from '@angular/core';

/** Rows per page offered by the table pager. */
export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Items of a 1-based page. */
export function pageOf<T>(items: readonly T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** Paging state of a table: shown by `<app-table-pager>`, the table lists `rows()`. */
export interface Paging<T> {
  /** Rows per page. */
  readonly size: WritableSignal<number>;
  /** 1-based page; back to 1 when the size or the reset source changes. */
  readonly page: Signal<number>;
  readonly pages: Signal<number>;
  readonly total: Signal<number>;
  /** Rows of the current page. */
  readonly rows: Signal<T[]>;
  /** Positions of the listed rows in the whole list, e.g. "51–100" ("0" when empty). */
  readonly range: Signal<string>;
  /** Turns to a page, kept within 1 and the last page. */
  goTo(page: number): void;
  /** Turns to the page that holds the item at this index of the whole list. */
  showIndex(index: number): void;
}

/**
 * Paging over `items`. `resetOn` (e.g. the filter) sends the table back to the first page when it changes; other
 * changes of `items` (e.g. a refresh) keep the page, within the pages that are left.
 */
export function createPaging<T>(
  items: () => readonly T[],
  resetOn: () => unknown = () => undefined,
  initialSize: number = DEFAULT_PAGE_SIZE,
): Paging<T> {
  const size = signal(initialSize);
  const total = computed(() => items().length);
  const pages = computed(() => pageCount(total(), size()));
  const chosen = linkedSignal({ source: () => ({ reset: resetOn(), size: size() }), computation: () => 1 });
  const page = computed(() => Math.min(chosen(), pages()));
  const rows = computed(() => pageOf(items(), page(), size()));
  const range = computed(() => {
    if (total() === 0) {
      return '0';
    }
    const first = (page() - 1) * size() + 1;
    return `${first}–${first + rows().length - 1}`;
  });
  const goTo = (value: number) => chosen.set(Math.min(pages(), Math.max(1, value)));

  return {
    size,
    page,
    pages,
    total,
    rows,
    range,
    goTo,
    showIndex: (index) => goTo(Math.floor(index / size()) + 1),
  };
}
