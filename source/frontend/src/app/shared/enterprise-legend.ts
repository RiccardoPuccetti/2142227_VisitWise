import { Component, input } from '@angular/core';

/** What the legend needs: `Enterprise`, `EnterpriseMapping` and `EnterpriseAmount` all fit. */
export interface LegendEntry {
  name: string;
  color: string;
}

/**
 * Color key of the enterprises, same colors as the map markers.
 *
 * ```html
 * <app-enterprise-legend [enterprises]="importDetail().enterprises" />
 * ```
 */
@Component({
  selector: 'app-enterprise-legend',
  template: `
    <ul class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" [attr.aria-label]="label()">
      @for (entry of enterprises(); track entry.name) {
        <li class="flex items-center gap-2">
          <span
            class="border-foreground/20 size-3 shrink-0 rounded-full border"
            [style.background-color]="entry.color"
            aria-hidden="true"
          ></span>
          <span>{{ entry.name }}</span>
        </li>
      }
    </ul>
  `,
})
export class EnterpriseLegend {
  readonly enterprises = input.required<readonly LegendEntry[]>();
  readonly label = input('Enterprises');
}
