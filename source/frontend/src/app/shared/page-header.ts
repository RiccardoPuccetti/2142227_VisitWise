import { Component, ElementRef, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One step of the breadcrumb above the title, e.g. `{ label: 'Imports', link: '/imports' }`. */
export interface Crumb {
  label: string;
  link: string | readonly (string | number)[];
}

/**
 * Top of every page (US-38): breadcrumb, title, description and actions, joined to the page panel by a full-width
 * divider. The description is the projected content; the actions are the element marked `actions`.
 *
 * ```html
 * <app-page-header [trail]="[{ label: 'Imports', link: '/imports' }]" [title]="import.name">
 *   <p>Imported on 28 Sept 2026 from sample-erp-layout.xlsx</p>
 *   <div actions><a hlmBtn routerLink="map">Open the map</a></div>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    @if (trail().length > 0) {
      <nav aria-label="Breadcrumb" class="mb-2">
        <ol class="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
          @for (crumb of trail(); track crumb.label) {
            <li class="flex items-center gap-1.5">
              <a [routerLink]="crumb.link" class="hover:text-foreground transition-colors">{{ crumb.label }}</a>
              <span aria-hidden="true" class="opacity-50">/</span>
            </li>
          }
          <li class="min-w-0">
            <span aria-current="page" class="text-foreground block truncate font-medium">{{ title() }}</span>
          </li>
        </ol>
      </nav>
    }
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h1
          #heading
          tabindex="-1"
          class="text-[1.625rem] leading-tight font-semibold tracking-[-0.015em] text-balance outline-none"
        >
          {{ title() }}
        </h1>
        <div data-slot="page-description" class="text-muted-foreground text-sm"><ng-content /></div>
      </div>
      <div data-slot="page-actions" class="flex flex-wrap items-center gap-2">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
  styles: `
    /* Bleeds to the edges of the page panel (--page-pad-x/y set by the app shell), so the divider joins the frame. */
    :host {
      display: block;
      margin: calc(var(--page-pad-y, 1.5rem) * -1) calc(var(--page-pad-x, 1rem) * -1) 1.5rem;
      padding: var(--page-pad-y, 1.5rem) var(--page-pad-x, 1rem) 1.25rem;
      border-bottom: 1px solid var(--border);
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly trail = input<readonly Crumb[]>([]);

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  /** Moves the keyboard focus to the title, e.g. after the element that had it was removed. */
  focusTitle(): void {
    this.heading().nativeElement.focus();
  }
}
