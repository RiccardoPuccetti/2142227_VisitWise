import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/** One of the secondary figures of a {@link KpiSummary}. */
export interface KpiDetail {
  label: string;
  /** Already formatted by the caller. */
  value: string;
  hint?: string | null;
  /** Name of a lucide icon registered by the page, e.g. `lucideMapPin`. */
  icon: string;
}

/**
 * The key figures of a page: the headline figure large, with an optional bar when it is a share (e.g. the covered
 * revenue out of the eligible one), and the other figures beside it as a short list of label and value.
 *
 * The caller formats every value (e.g. with `formatEur`), so the summary works for money, counts and percentages.
 * The icons must be provided with `provideIcons` by the page.
 *
 * ```html
 * <app-kpi-summary label="Covered revenue" [value]="revenue()" hint="62% of the eligible revenue" [progress]="0.62"
 *                  [details]="[{ label: 'Visits', value: '40', hint: '31 customers', icon: 'lucideMapPin' }]" />
 * ```
 */
@Component({
  selector: 'app-kpi-summary',
  imports: [HlmCardImports, HlmProgressImports, HlmSkeletonImports, NgIcon],
  host: { class: 'block' },
  template: `
    <section class="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" [attr.aria-busy]="loading()">
      <div hlmCard size="sm" data-testid="kpi-headline" class="justify-center">
        <div hlmCardContent class="flex flex-col gap-2">
          <h3 class="text-muted-foreground text-sm font-medium">{{ label() }}</h3>
          @if (loading()) {
            <!-- The lines of the result (value, bar, hint), so nothing jumps when the figures arrive. -->
            <hlm-skeleton class="h-8 w-44" />
            <hlm-skeleton class="mt-1 h-1.5 w-full" />
            <hlm-skeleton class="h-3 w-32" />
            <span class="sr-only">Loading</span>
          } @else {
            <p class="motion-fade text-[2rem] leading-none font-semibold tracking-tight tabular-nums">{{ value() }}</p>
            @if (percent() !== null) {
              <hlm-progress class="mt-1 h-1.5" [value]="percent()" [attr.aria-label]="label() + ': ' + percent() + '%'">
                <hlm-progress-indicator />
              </hlm-progress>
            }
            @if (hint()) {
              <p class="text-muted-foreground text-xs">{{ hint() }}</p>
            }
          }
        </div>
      </div>

      <dl hlmCard size="sm" data-testid="kpi-details" class="justify-center gap-0 py-0">
        @for (detail of details(); track detail.label; let first = $first) {
          <div class="flex items-center justify-between gap-4 px-4 py-3" [class.border-t]="!first">
            <dt class="text-muted-foreground flex items-center gap-2 text-sm">
              <ng-icon [name]="detail.icon" class="shrink-0" aria-hidden="true" />
              {{ detail.label }}
            </dt>
            <dd class="flex flex-col items-end text-right">
              @if (loading()) {
                <hlm-skeleton class="h-5 w-12" />
                <hlm-skeleton class="mt-1 h-3 w-24" />
              } @else {
                <span class="font-semibold tabular-nums">{{ detail.value }}</span>
                @if (detail.hint) {
                  &ngsp;<span class="text-muted-foreground text-xs">{{ detail.hint }}</span>
                }
              }
            </dd>
          </div>
        }
      </dl>
    </section>
  `,
})
export class KpiSummary {
  readonly label = input.required<string>();
  readonly value = input<string>('–');
  readonly hint = input<string | null>(null);
  /** Share (0..1) drawn as a bar under the headline; null when the headline is not a share. */
  readonly progress = input<number | null>(null);
  readonly details = input<readonly KpiDetail[]>([]);
  readonly loading = input(false);

  protected readonly percent = computed(() => {
    const share = this.progress();
    return share === null || !Number.isFinite(share) ? null : Math.round(Math.min(Math.max(share, 0), 1) * 100);
  });
}
