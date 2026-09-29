import { Service, signal } from '@angular/core';
import { readStored, writeStored } from '../../core/storage';

export type ImportsView = 'cards' | 'table';

export const IMPORTS_VIEW_STORAGE_KEY = 'visitwise-imports-view';

/** US-10: the imports list as cards or as a table. The choice is kept in this browser only. */
@Service()
export class ImportsViewPreference {
  private readonly current = signal<ImportsView>(
    readStored(IMPORTS_VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards',
  );

  readonly view = this.current.asReadonly();

  set(view: ImportsView): void {
    this.current.set(view);
    writeStored(IMPORTS_VIEW_STORAGE_KEY, view);
  }
}
