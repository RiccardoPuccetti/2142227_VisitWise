import { Component, computed, input } from '@angular/core';

export interface ChartPoint {
  /** Label under the point on the x axis, e.g. "20 d". */
  label: string;
  value: number;
}

interface DrawnPoint extends ChartPoint {
  x: number;
  y: number;
}

const WIDTH = 480;
const HEIGHT = 200;
const PAD = { top: 18, right: 16, bottom: 26, left: 44 };
const GRID_LINES = 4;

let gradientCount = 0;

/**
 * A single series over ordered categories: area with a soft gradient, a line and one dot per point, with light grid
 * lines and axis labels; each dot names its value on hover. Plain SVG, themed by the CSS tokens (`--chart-1` by
 * default).
 *
 * ```html
 * <app-area-chart [points]="curve()" [max]="1" [format]="percent" ariaLabel="Coverage by working days" />
 * ```
 */
@Component({
  selector: 'app-area-chart',
  host: { class: 'block' },
  template: `
    @if (drawn().length === 0) {
      <p class="text-muted-foreground text-sm">No data to draw.</p>
    } @else {
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        class="h-auto w-full"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        <defs>
          <linearGradient [id]="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.35" />
            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        @for (tick of ticks(); track tick.y) {
          <line
            [attr.x1]="pad.left"
            [attr.x2]="width - pad.right"
            [attr.y1]="tick.y"
            [attr.y2]="tick.y"
            class="stroke-chart-grid"
            stroke-width="1"
          />
          <text
            [attr.x]="pad.left - 8"
            [attr.y]="tick.y + 3"
            text-anchor="end"
            class="fill-muted-foreground"
            font-size="10"
          >
            {{ tick.label }}
          </text>
        }

        <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId + ')'" />
        <path
          [attr.d]="linePath()"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        @for (point of drawn(); track point.label) {
          <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4.5" class="fill-card" [attr.stroke]="color()" stroke-width="2.5">
            <title>{{ point.label }}: {{ format()(point.value) }}</title>
          </circle>
          <text
            [attr.x]="point.x"
            [attr.y]="height - 8"
            text-anchor="middle"
            class="fill-muted-foreground"
            font-size="10"
          >
            {{ point.label }}
          </text>
        }
      </svg>
    }
  `,
})
export class AreaChart {
  readonly points = input.required<readonly ChartPoint[]>();
  /** Top of the y axis; the largest value (with headroom) when missing. */
  readonly max = input<number | null>(null);
  /** Formats a value for the axis, the labels and the tooltips. */
  readonly format = input<(value: number) => string>((value) => String(value));
  readonly color = input('var(--chart-1)');
  readonly ariaLabel = input('Chart');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly pad = PAD;
  protected readonly gradientId = `area-gradient-${++gradientCount}`;

  private readonly top = computed(() => {
    const explicit = this.max();
    if (explicit !== null && explicit > 0) {
      return explicit;
    }
    const largest = Math.max(0, ...this.points().map((point) => point.value));
    return largest > 0 ? largest * 1.15 : 1;
  });

  protected readonly drawn = computed<DrawnPoint[]>(() => {
    const points = this.points();
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
    return points.map((point, index) => ({
      ...point,
      x: points.length > 1 ? PAD.left + index * step : PAD.left + innerWidth / 2,
      y: PAD.top + innerHeight - (Math.min(point.value, this.top()) / this.top()) * innerHeight,
    }));
  });

  protected readonly ticks = computed(() => {
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    return Array.from({ length: GRID_LINES + 1 }, (_, index) => {
      const share = index / GRID_LINES;
      return { y: PAD.top + innerHeight - share * innerHeight, label: this.format()(share * this.top()) };
    });
  });

  protected readonly linePath = computed(() =>
    this.drawn()
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const points = this.drawn();
    if (points.length === 0) {
      return '';
    }
    const baseline = HEIGHT - PAD.bottom;
    const first = points[0];
    const last = points[points.length - 1];
    return `${this.linePath()} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  });
}
