import { DOCUMENT } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

/** Pages of one import, shown in the header when the URL is `/imports/:importId/...`. */
const IMPORT_SECTIONS = [
  { path: '', label: 'Overview', exact: true },
  { path: 'map', label: 'Map', exact: false },
  { path: 'planner', label: 'Planner', exact: false },
  { path: 'scenarios', label: 'Scenarios', exact: false },
] as const;

/** Extracts the numeric import id from a URL such as `/imports/42/map`; `/imports/new` has none. */
export function importIdFromUrl(url: string): number | null {
  const match = /^\/imports\/(\d+)(?:[/?#]|$)/.exec(url);
  return match ? Number(match[1]) : null;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, HlmButtonImports, HlmToasterImports],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly auth = inject(AuthService);
  /** US-36 (Puccetti, PUC-11): dark mode toggle, also before login. */
  protected readonly theme = inject(ThemeService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly importId = computed(() => importIdFromUrl(this.url()));

  protected readonly importSections = computed(() => {
    const id = this.importId();
    return id === null
      ? []
      : IMPORT_SECTIONS.map((section) => ({
          ...section,
          link: section.path ? ['/imports', id, section.path] : ['/imports', id],
        }));
  });

  /**
   * With `<base href="/">` a plain `#main` link would navigate to `/#main` and reload the route,
   * so the skip link moves the focus itself.
   */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main')?.focus();
  }

  /** Tenant menu (Puccetti, PUC-9). */
  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
