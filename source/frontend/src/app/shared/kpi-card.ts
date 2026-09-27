import { Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * One indicator: a label, a value already formatted by the caller, an optional hint.
 *
 * The caller formats the value (e.g. with the `eur` pipe or `formatEur`) so the card works
 * for money, counts and percentages alike.
 *
 * ```html
 * <app-kpi-card label="Covered revenue" [value]="kpis().coveredRevenue | eur: 'rounded'"
 *               hint="62% of eligible revenue" />
 * <app-kpi-card label="Visits" [value]="'' + kpis().plannedVisits" [loading]="loading()" />
 * ```
 */
@Component({
  selector: 'app-kpi-card',
  imports: [HlmCardImports, HlmSkeletonImports],
  template: `
    <section hlmCard size="sm" class="h-full" [attr.aria-busy]="loading()">
      <div hlmCardHeader>
        <h3 hlmCardDescription>{{ label() }}</h3>
      </div>
      <div hlmCardContent class="flex flex-col gap-1">
        @if (loading()) {
          <hlm-skeleton class="h-8 w-28" />
          <span class="sr-only">Loading</span>
        } @else {
          <p class="text-2xl font-semibold tabular-nums">{{ value() }}</p>
          @if (hint()) {
            <p class="text-muted-foreground text-xs">{{ hint() }}</p>
          }
        }
      </div>
    </section>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input<string>('–');
  readonly hint = input<string | null>(null);
  readonly loading = input(false);
}
