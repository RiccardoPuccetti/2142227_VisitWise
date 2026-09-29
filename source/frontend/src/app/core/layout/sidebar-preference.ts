import { Service, signal } from '@angular/core';
import { readStored, writeStored } from '../storage';

export const SIDEBAR_STORAGE_KEY = 'visitwise-sidebar';

/** US-38: the desktop sidebar can shrink to icons to give the pages more width. Kept in this browser only. */
@Service()
export class SidebarPreference {
  private readonly state = signal(readStored(SIDEBAR_STORAGE_KEY) === 'collapsed');

  readonly collapsed = this.state.asReadonly();

  toggle(): void {
    const next = !this.state();
    this.state.set(next);
    writeStored(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded');
  }
}
