import { Component, ElementRef, input, viewChild } from '@angular/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * Top of every page (US-38): one row with the title and the actions, then a quiet strip with the facts of the page
 * (the projected content, usually a `ul.page-facts` of icon and text items). The sidebar already shows where the page
 * is, so there is no breadcrumb.
 *
 * ```html
 * <app-page-header [title]="import.name">
 *   <ul class="page-facts"><li><ng-icon name="lucideCalendarDays" aria-hidden="true" /> Imported on 28 Sept 2026</li></ul>
 *   <div actions><a hlmBtn routerLink="map">Open the map</a></div>
 * </app-page-header>
 * ```
 *
 * While the page loads, `[loading]="true"` shows placeholders for the title and the facts (the title stays readable
 * by screen readers), so the page does not jump when its data arrives.
 */
@Component({
  selector: 'app-page-header',
  imports: [HlmSkeletonImports],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-4">
      <h1
        #heading
        tabindex="-1"
        class="min-w-0 text-[1.5rem] leading-tight font-semibold tracking-[-0.015em] text-balance outline-none"
      >
        @if (loading()) {
          <span class="sr-only">{{ title() }}</span>
          <hlm-skeleton class="my-0.5 h-7 w-64 max-w-full" aria-hidden="true" />
        } @else {
          {{ title() }}
        }
      </h1>
      <div data-slot="page-actions" class="flex shrink-0 flex-wrap items-center gap-2 empty:hidden">
        <ng-content select="[actions]" />
      </div>
    </div>
    <div data-slot="page-description" class="text-muted-foreground border-t pt-3 text-sm empty:hidden">@if (loading()) {<hlm-skeleton class="h-5 w-80 max-w-full" aria-hidden="true" />}<ng-content /></div>
  `,
  styles: `
    /* Bleeds to the edges of the page panel (--page-pad-x/y set by the app shell), so the dividers join the frame.
       No bottom margin: every page puts the header in its column (flex gap). */
    :host {
      display: block;
      margin: calc(var(--page-pad-y, 1.5rem) * -1) calc(var(--page-pad-x, 1rem) * -1) 0;
      padding: calc(var(--page-pad-y, 1.5rem) * 0.75) var(--page-pad-x, 1rem) 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    /* Without facts the title row closes the header on its own. */
    :host:not(:has([data-slot='page-description'] > *)) {
      padding-bottom: 0;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly loading = input(false);

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  /** Moves the keyboard focus to the title, e.g. after the element that had it was removed. */
  focusTitle(): void {
    this.heading().nativeElement.focus();
  }
}
