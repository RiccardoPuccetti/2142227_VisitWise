import { Component, computed, input } from '@angular/core';
import { EurPipe } from '../../shared';

export interface BarItem {
  key: string;
  label: string;
  revenue: number;
  pointCount: number;
  /** Bar color; the primary color when missing. */
  color?: string;
}

/**
 * Horizontal bars of revenue, largest first as received (US-18). Values are written next to each bar, so the chart
 * reads without the bars. Only the first `limit` items are shown.
 */
@Component({
  selector: 'app-amount-bars',
  imports: [EurPipe],
  template: `
    <h3 class="mb-2 text-sm font-semibold">{{ title() }}</h3>
    @if (items().length === 0) {
      <p class="text-muted-foreground text-sm">No revenue for these filters.</p>
    } @else {
      <ol class="flex flex-col gap-2 text-sm">
        @for (item of shown(); track item.key) {
          <li class="flex flex-col gap-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate">{{ item.label }}</span>
              <span class="tabular-nums">{{ item.revenue | eur: 'rounded' }}</span>
            </div>
            <div class="bg-muted h-2 rounded-full" aria-hidden="true">
              <div
                class="bg-primary h-2 rounded-full"
                [style.width.%]="widthOf(item)"
                [style.background-color]="item.color ?? null"
              ></div>
            </div>
          </li>
        }
      </ol>
      @if (hidden() > 0) {
        <p class="text-muted-foreground mt-2 text-xs">and {{ hidden() }} more</p>
      }
    }
  `,
})
export class AmountBars {
  readonly title = input.required<string>();
  readonly items = input.required<readonly BarItem[]>();
  readonly limit = input(5);

  protected readonly shown = computed(() => this.items().slice(0, this.limit()));
  protected readonly hidden = computed(() => Math.max(0, this.items().length - this.limit()));
  private readonly max = computed(() => Math.max(0, ...this.items().map((item) => item.revenue)));

  protected widthOf(item: BarItem): number {
    return this.max() > 0 ? Math.max(0, (item.revenue / this.max()) * 100) : 0;
  }
}
