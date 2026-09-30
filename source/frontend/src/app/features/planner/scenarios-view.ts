import { Service, signal } from '@angular/core';
import { readStored, writeStored } from '../../core/storage';

export type ScenariosView = 'table' | 'chart';

export const SCENARIOS_VIEW_STORAGE_KEY = 'visitwise-scenarios-view';

/** US-27: the saved scenarios compared in a table (default) or as bars. The choice is kept in this browser only. */
@Service()
export class ScenariosViewPreference {
  private readonly current = signal<ScenariosView>(
    readStored(SCENARIOS_VIEW_STORAGE_KEY) === 'chart' ? 'chart' : 'table',
  );

  readonly view = this.current.asReadonly();

  set(view: ScenariosView): void {
    this.current.set(view);
    writeStored(SCENARIOS_VIEW_STORAGE_KEY, view);
  }
}
