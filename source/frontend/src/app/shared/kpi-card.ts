import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/** Color of the icon badge: `brand` for the headline figure, `neutral` for the rest, or a `--chart-n` series. */
export type KpiTone = 'brand' | 'neutral' | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';

/**
 * One indicator: a label, a value already formatted by the caller, an optional hint and an optional icon.
 *
 * The caller formats the value (e.g. with the `eur` pipe or `formatEur`) so the card works
 * for money, counts and percentages alike. The icon must be provided with `provideIcons` by the page.
 *
 * ```html
 * <app-kpi-card label="Covered revenue" [value]="kpis().coveredRevenue | eur: 'rounded'"
 *               hint="62% of eligible revenue" icon="lucideEuro" tone="brand" />
 * <app-kpi-card label="Visits" [value]="'' + kpis().plannedVisits" [loading]="loading()" />
 * ```
 */
@Component({
  selector: 'app-kpi-card',
  imports: [HlmCardImports, HlmSkeletonImports, NgIcon],
  host: { class: 'block h-full' },
  template: `
    <section hlmCard size="sm" class="h-full" [attr.aria-busy]="loading()" [attr.data-tone]="tone()">
      <div hlmCardContent class="flex h-full flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-muted-foreground text-sm font-medium">{{ label() }}</h3>
          @if (icon(); as name) {
            <span class="kpi-icon" aria-hidden="true"><ng-icon [name]="name" /></span>
          }
        </div>
        <div class="flex flex-col gap-1">
          @if (loading()) {
            <hlm-skeleton class="h-8 w-28" />
            <span class="sr-only">Loading</span>
          } @else {
            <p class="text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">{{ value() }}</p>
            @if (hint()) {
              <p class="text-muted-foreground text-xs">{{ hint() }}</p>
            }
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .kpi-icon {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.75rem;
      background: var(--kpi-bg, var(--secondary));
      color: var(--kpi-fg, var(--secondary-foreground));
      font-size: 1.125rem;
    }
    [data-tone='brand'] {
      --kpi-bg: var(--brand-soft);
      --kpi-fg: var(--brand);
    }
    [data-tone='chart-1'] {
      --kpi-bg: color-mix(in oklab, var(--chart-1) 15%, transparent);
      --kpi-fg: var(--chart-1);
    }
    [data-tone='chart-2'] {
      --kpi-bg: color-mix(in oklab, var(--chart-2) 15%, transparent);
      --kpi-fg: var(--chart-2);
    }
    [data-tone='chart-3'] {
      --kpi-bg: color-mix(in oklab, var(--chart-3) 15%, transparent);
      --kpi-fg: var(--chart-3);
    }
    [data-tone='chart-4'] {
      --kpi-bg: color-mix(in oklab, var(--chart-4) 15%, transparent);
      --kpi-fg: var(--chart-4);
    }
    [data-tone='chart-5'] {
      --kpi-bg: color-mix(in oklab, var(--chart-5) 15%, transparent);
      --kpi-fg: var(--chart-5);
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input<string>('–');
  readonly hint = input<string | null>(null);
  readonly loading = input(false);
  /** Name of a lucide icon registered by the page, e.g. `lucideEuro`. */
  readonly icon = input<string | null>(null);
  readonly tone = input<KpiTone>('neutral');
}