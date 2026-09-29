import { Component, computed, input } from '@angular/core';
import { EurPipe, formatPercent } from '../../shared';

export interface BarItem {
  key: string;
  label: string;
  revenue: number;
  pointCount: number;
  /** Bar color; the primary color when missing. */
  color?: string;
}


/**
 * Ranked horizontal bars of revenue, largest first as received (US-18). Each row gives the rank, the label, the amount
 * and the share of the total, so the chart reads without the bars. Only the first `limit` items are shown.
 */
@Component({
  selector: 'app-amount-bars',
  imports: [EurPipe],
  host: { class: 'block' },
  template: `
    @if (items().length === 0) {
      <p class="text-muted-foreground text-sm">No revenue for these filters.</p>
    } @else {
      <ol class="flex flex-col gap-3 text-sm">
        @for (item of shown(); track item.key; let i = $index) {
          <li class="flex flex-col gap-1.5">
            <div class="flex items-baseline gap-2">
              <span class="text-muted-foreground w-4 shrink-0 text-xs tabular-nums">{{ i + 1 }}</span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ item.label }}</span>
              <span class="text-muted-foreground text-xs tabular-nums">{{ shareOf(item) }}</span>
              <span class="w-24 text-right tabular-nums">{{ item.revenue | eur: 'rounded' }}</span>
            </div>
            <div class="bg-muted ml-6 h-2 overflow-hidden rounded-full" aria-hidden="true">
              <div
                class="amount-bar h-full rounded-full"
                [style.width.%]="widthOf(item)"
                [style.background-color]="item.color ?? 'var(--chart-1)'"
              ></div>
            </div>
          </li>
        }
      </ol>
      @if (hidden() > 0) {
        <p class="text-muted-foreground mt-3 text-xs">and {{ hidden() }} more</p>
      }
    }
  `,
  styles: `
    /* The bars grow from zero when they appear, then slide to their new length when the filters change. The width
       is an inline style, hence !important on the start. */
    .amount-bar {
      transition: width 600ms cubic-bezier(0.2, 0, 0, 1);
    }
    @starting-style {
      .amount-bar {
        width: 0 !important;
      }
    }
  `,
})
export class AmountBars {
  readonly items = input.required<readonly BarItem[]>();
  readonly limit = input(5);

  protected readonly shown = computed(() => this.items().slice(0, this.limit()));
  protected readonly hidden = computed(() => Math.max(0, this.items().length - this.limit()));
  private readonly max = computed(() => Math.max(0, ...this.items().map((item) => item.revenue)));
  private readonly total = computed(() => this.items().reduce((sum, item) => sum + item.revenue, 0));

  protected widthOf(item: BarItem): number {
    return this.max() > 0 ? Math.max(0, (item.revenue / this.max()) * 100) : 0;
  }

  protected shareOf(item: BarItem): string {
    return this.total() > 0 ? formatPercent(item.revenue / this.total(), 0) : '–';
  }
}