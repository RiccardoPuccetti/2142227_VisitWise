import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarRange,
  lucideFolderOpen,
  lucideGitCompareArrows,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMap,
  lucideMoon,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucideRoute,
  lucideSun,
  lucideUpload,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { filter, firstValueFrom, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { SidebarPreference } from './core/layout/sidebar-preference';
import type { ImportSummary } from './core/models/api.models';
import { ThemeService } from './core/theme/theme.service';

/**
 * Pages of one import, shown in the navigation when the URL is `/imports/:importId/...`. A section is current on its
 * own path and below it, and on the `also` paths: a saved plan (`plans/:planId`) is opened from the scenarios.
 */
const IMPORT_SECTIONS: readonly { path: string; label: string; icon: string; also?: readonly string[] }[] = [
  { path: '', label: 'Overview', icon: 'lucideLayoutDashboard' },
  { path: 'map', label: 'Map', icon: 'lucideMap' },
  { path: 'planner', label: 'Planner', icon: 'lucideCalendarRange' },
  { path: 'scenarios', label: 'Scenarios', icon: 'lucideGitCompareArrows', also: ['plans'] },
];

/** Extracts the numeric import id from a URL such as `/imports/42/map`; `/imports/new` has none. */
export function importIdFromUrl(url: string): number | null {
  const match = /^\/imports\/(\d+)(?:[/?#]|$)/.exec(url);
  return match ? Number(match[1]) : null;
}

/** Up to two letters for the account badge of the header (US-38), e.g. "Demo federation" -> "DF". */
export function tenantInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
  return words.length === 0 ? '?' : words.slice(0, 2).map((word) => word[0].toUpperCase()).join('');
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, HlmButtonImports, HlmToasterImports],
  providers: [
    provideIcons({
      lucideCalendarRange,
      lucideFolderOpen,
      lucideGitCompareArrows,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideMap,
      lucideMoon,
      lucidePanelLeftClose,
      lucidePanelLeftOpen,
      lucideRoute,
      lucideSun,
      lucideUpload,
    }),
  ],
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
  /** US-38 (Puccetti, PUC-13): desktop sidebar, collapsible to icons. */
  protected readonly sidebar = inject(SidebarPreference);
  private readonly http = inject(HttpClient);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly importId = computed(() => importIdFromUrl(this.url()));

  protected readonly initials = computed(() => tenantInitials(this.auth.currentTenant()?.name ?? ''));

  /** Name of the open import, shown above its sections (endpoint 5; the tenant guard answers 404 for others). */
  private readonly openImport = resource({
    params: () => (this.auth.currentTenant() ? (this.importId() ?? undefined) : undefined),
    loader: ({ params }) => firstValueFrom(this.http.get<ImportSummary>(`/api/imports/${params}`)),
  });
  protected readonly importName = computed(() => {
    const id = this.importId();
    return this.openImport.hasValue() && this.openImport.value().id === id ? this.openImport.value().name : null;
  });

  protected readonly importSections = computed(() => {
    const id = this.importId();
    if (id === null) {
      return [];
    }
    // The first segment after /imports/:id ('' on the overview), without query or fragment.
    const segment = this.url().split(/[?#]/)[0].split('/')[3] ?? '';
    return IMPORT_SECTIONS.map((section) => ({
      ...section,
      link: section.path ? ['/imports', id, section.path] : ['/imports', id],
      current: segment === section.path || (section.also?.includes(segment) ?? false),
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
