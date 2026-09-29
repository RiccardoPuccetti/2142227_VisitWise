import { Component, computed, input } from '@angular/core';
import { formatPercent } from '../format';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** Fill of the slice; the n-th `--chart-n` token when missing. */
  color?: string;
}

interface DrawnSlice extends DonutSlice {
  fill: string;
  share: number;
  /** SVG arc path of the slice, or `null` when it is the only one (a full ring is drawn instead). */
  path: string | null;
}

const RADIUS = 42;
const THICKNESS = 12;
const CENTER = 50;

function polar(angle: number, radius: number): [number, number] {
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

/** Ring segment from `start` to `end` (radians). */
function arcPath(start: number, end: number): string {
  const outer = RADIUS;
  const inner = RADIUS - THICKNESS;
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(start, outer);
  const [x2, y2] = polar(end, outer);
  const [x3, y3] = polar(end, inner);
  const [x4, y4] = polar(start, inner);
  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

/**
 * Share of a total, as a ring with a legend. The center shows the total (already formatted by the caller) and the
 * legend gives every value with its share, so the chart reads without colors. Plain SVG, themed by the CSS tokens.
 *
 * ```html
 * <app-donut-chart [slices]="enterpriseSlices()" [total]="summary().totalRevenue | eur: 'compact'"
 *                  totalLabel="Total revenue" [format]="formatCompact" />
 * ```
 */
@Component({
  selector: 'app-donut-chart',
  host: { class: 'block' },
  template: `
    @if (drawn().length === 0) {
      <p class="text-muted-foreground text-sm">No data for these filters.</p>
    } @else {
      <div class="flex flex-wrap items-center gap-6">
        <figure class="relative size-40 shrink-0">
          <svg viewBox="0 0 100 100" class="size-full -rotate-90" role="img" [attr.aria-label]="ariaLabel()">
            <circle
              cx="50"
              cy="50"
              [attr.r]="ringRadius"
              fill="none"
              class="stroke-muted"
              [attr.stroke-width]="thickness"
            />
            @for (slice of drawn(); track slice.key) {
              @if (slice.path) {
                <path [attr.d]="slice.path" [attr.fill]="slice.fill" class="stroke-card" stroke-width="1.5">
                  <title>{{ slice.label }}: {{ format()(slice.value) }} ({{ percent(slice.share) }})</title>
                </path>
              } @else {
                <circle
                  cx="50"
                  cy="50"
                  [attr.r]="ringRadius"
                  fill="none"
                  [attr.stroke]="slice.fill"
                  [attr.stroke-width]="thickness"
                >
                  <title>{{ slice.label }}: {{ format()(slice.value) }}</title>
                </circle>
              }
            }
          </svg>
          <figcaption class="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span class="text-lg leading-tight font-semibold tabular-nums">{{ total() }}</span>
            @if (totalLabel()) {
              <span class="text-muted-foreground text-[0.6875rem]">{{ totalLabel() }}</span>
            }
          </figcaption>
        </figure>
        <ol class="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          @for (slice of drawn(); track slice.key) {
            <li class="flex items-center gap-2.5">
              <span
                class="size-2.5 shrink-0 rounded-full"
                [style.background-color]="slice.fill"
                aria-hidden="true"
              ></span>
              <span class="min-w-0 flex-1 truncate">{{ slice.label }}</span>
              <span class="text-muted-foreground text-xs tabular-nums">{{ percent(slice.share) }}</span>
              <span class="w-20 text-right font-medium tabular-nums">{{ format()(slice.value) }}</span>
            </li>
          }
        </ol>
      </div>
    }
  `,
})
export class DonutChart {
  readonly slices = input.required<readonly DonutSlice[]>();
  /** Center figure, already formatted. */
  readonly total = input<string>('');
  readonly totalLabel = input<string | null>(null);
  readonly ariaLabel = input('Share of the total');
  /** Formats a slice value for the legend and tooltips. */
  readonly format = input<(value: number) => string>((value) => String(value));

  protected readonly ringRadius = RADIUS - THICKNESS / 2;
  protected readonly thickness = THICKNESS;

  protected readonly drawn = computed<DrawnSlice[]>(() => {
    const slices = this.slices().filter((slice) => slice.value > 0);
    const sum = slices.reduce((total, slice) => total + slice.value, 0);
    if (sum <= 0) {
      return [];
    }
    let angle = 0;
    return slices.map((slice, index) => {
      const share = slice.value / sum;
      const start = angle;
      const end = angle + share * 2 * Math.PI;
      angle = end;
      return {
        ...slice,
        share,
        fill: slice.color ?? `var(--chart-${(index % 5) + 1})`,
        path: slices.length === 1 ? null : arcPath(start, Math.min(end, 2 * Math.PI - 0.0001)),
      };
    });
  });

  protected percent(share: number): string {
    return formatPercent(share);
  }
}
