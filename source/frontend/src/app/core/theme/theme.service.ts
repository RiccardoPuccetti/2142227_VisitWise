import { computed, DOCUMENT, effect, inject, Service, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Also read by public/theme-init.js, which applies the theme before Angular starts (no flash on load). */
export const THEME_STORAGE_KEY = 'visitwise-theme';

/**
 * US-36: light or dark interface. Follows the operating system until the user picks one with {@link toggle}; the
 * choice is kept in this browser only. The theme is the `dark` class on `<html>` (dark tokens in styles.css).
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemQuery = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.systemQuery?.matches ?? false);
  private readonly chosen = signal<Theme | null>(this.readChoice());

  readonly theme = computed<Theme>(() => this.chosen() ?? (this.systemDark() ? 'dark' : 'light'));

  constructor() {
    this.systemQuery?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => this.document.documentElement.classList.toggle('dark', this.theme() === 'dark'));
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.chosen.set(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage refused (private mode, blocked site data): the choice lasts until the page is closed.
    }
  }

  private readChoice(): Theme | null {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }
}
