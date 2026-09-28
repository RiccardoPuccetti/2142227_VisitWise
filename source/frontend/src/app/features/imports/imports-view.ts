import { Service, signal } from '@angular/core';

export type ImportsView = 'cards' | 'table';

export const IMPORTS_VIEW_STORAGE_KEY = 'visitwise-imports-view';

/** US-10: the imports list as cards or as a table. The choice is kept in this browser only. */
@Service()
export class ImportsViewPreference {
  private readonly current = signal<ImportsView>(this.readChoice());

  readonly view = this.current.asReadonly();

  set(view: ImportsView): void {
    this.current.set(view);
    try {
      localStorage.setItem(IMPORTS_VIEW_STORAGE_KEY, view);
    } catch {
      // Storage refused (private mode, blocked site data): the choice lasts until the page is closed.
    }
  }

  private readChoice(): ImportsView {
    try {
      return localStorage.getItem(IMPORTS_VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  }
}
