import { Component, computed, input } from '@angular/core';
import type { PlanSummary } from '../../core/models/api.models';
import { bestColumns, formatKpi, KPI_ROWS } from './scenario-compare.model';

/**
 * Scenario colors, in the order of the compared scenarios: the chart tokens softened with the card color, so the bars
 * stay calm beside the numbers. --chart-1 is the brand color, kept for the best value.
 */
const SERIES = ['--chart-2', '--chart-3', '--chart-4', '--chart-5'].map(
  (token) => `color-mix(in oklab, var(${token}) 80%, var(--card))`,
);

/**
 * US-27: the compared scenarios as bars, one row per indicator, one bar per scenario scaled to the row's largest value;
 * the best value of each row is marked (the fewest km, days and hours; the most revenue, coverage, visits and
 * customers). The exact values stay written beside the bars.
 *
 * ```html
 * <app-scenario-bars [scenarios]="compared()" />
 * ```
 */
@Component({
  selector: 'app-scenario-bars',
  host: { class: 'flex flex-col gap-4' },
  template: `
    <ul data-testid="scenario-legend" class="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Scenarios">
      @for (scenario of scenarios(); track scenario.id; let index = $index) {
        <li class="flex items-center gap-2">
          <span class="size-2.5 shrink-0 rounded-[3px]" [style.background]="color(index)" aria-hidden="true"></span>
          <span class="font-medium">{{ scenario.name }}</span>
          <span class="text-muted-foreground text-xs">{{ scenario.parameters.workingDays }} working days</span>
        </li>
      }
    </ul>
    <div class="divide-y rounded-2xl border px-4">
      @for (row of rows(); track row.key) {
        <div class="grid items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <div>
            <p class="text-sm">{{ row.label }}</p>
            <p class="text-muted-foreground text-xs">{{ row.better }} is better</p>
          </div>
          <ul data-testid="kpi-bars" class="flex flex-col gap-1.5" [attr.aria-label]="row.label">
            @for (bar of row.bars; track bar.id) {
              <li
                data-testid="kpi-bar"
                class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 text-xs tabular-nums"
                [attr.data-best]="bar.best ? 'true' : null"
              >
                <span class="bg-muted/60 block h-2 overflow-hidden rounded-full" aria-hidden="true">
                  <i class="block h-full rounded-full" [style.width]="bar.width" [style.background]="bar.color"></i>
                </span>
                <span class="text-right" [class.text-brand]="bar.best" [class.font-semibold]="bar.best">
                  <span class="sr-only">{{ bar.name }}: </span>{{ bar.value }}
                  @if (bar.best) {
                    <span class="sr-only">(best)</span>
                  }
                </span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class ScenarioBars {
  readonly scenarios = input.required<readonly PlanSummary[]>();

  protected readonly rows = computed(() => {
    const scenarios = this.scenarios();
    const best = bestColumns([...scenarios]);
    return KPI_ROWS.map((row) => {
      const values = scenarios.map((scenario) => Math.max(0, Number(scenario.kpis[row.key])));
      const max = Math.max(0, ...values);
      return {
        key: row.key,
        label: row.label,
        better: row.better === 'higher' ? 'higher' : 'lower',
        bars: scenarios.map((scenario, index) => ({
          id: scenario.id,
          name: scenario.name,
          value: formatKpi(row, scenario.kpis),
          width: `${max > 0 ? Math.round((values[index] / max) * 1000) / 10 : 0}%`,
          color: this.color(index),
          best: best[row.key]?.includes(index) ?? false,
        })),
      };
    });
  });

  protected color(index: number): string {
    return SERIES[index % SERIES.length];
  }
}
