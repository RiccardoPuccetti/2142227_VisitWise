import { Service, signal } from '@angular/core';

export const SIDEBAR_STORAGE_KEY = 'visitwise-sidebar';

/** US-38: the desktop sidebar can shrink to icons to give the pages more width. Kept in this browser only. */
@Service()
export class SidebarPreference {
  private readonly state = signal(this.readChoice());

  readonly collapsed = this.state.asReadonly();

  toggle(): void {
    const next = !this.state();
    this.state.set(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // Storage refused (private mode, blocked site data): the choice lasts until the page is closed.
    }
  }

  private readChoice(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
    } catch {
      return false;
    }
  }
}
