import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpRight,
  lucideCalendarRange,
  lucideGitCompare,
  lucideInfo,
  lucideTrash2,
  lucideTrendingUp,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type {
  PlanKpis,
  PlanParameters,
  PlanSummary,
  WhatIfResult,
} from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { EurPipe, formatEur, PageHeader } from '../../shared';
import { DEFAULT_BASE } from './planner.model';
import { PlannerService } from './planner.service';
import {
  KPI_ROWS,
  type KpiRow,
  bestColumns,
  coverageCurve,
  defaultParameters,
  parseHorizons,
} from './scenario-compare.model';

const PERCENT = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });
const DECIMAL = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
/** Drawing box of the coverage curve (SVG user units; the element scales to its container). */
const CHART = { width: 320, height: 120 } as const;
/** Room around the drawing for the labels above the points and under the axis. */
const CHART_PADDING = 22;
/** Side-by-side columns stay readable up to this many scenarios. */
const MAX_COMPARED = 4;
const DEFAULT_HORIZONS = '20, 30, 40';

/**
 * MAR-5: what-if analysis of one plan over several horizons (US-26) and side-by-side comparison of the
 * scenarios saved from the planner (US-27).
 */
@Component({
  selector: 'app-scenario-compare-page',
  imports: [
    RouterLink,
    NgIcon,
    PageHeader,
    HlmAlertImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
    HlmNativeSelectImports,
    HlmSpinnerImports,
    HlmTableImports,
    EurPipe,
  ],
  providers: [
    provideIcons({
      lucideArrowUpRight,
      lucideCalendarRange,
      lucideGitCompare,
      lucideInfo,
      lucideTrash2,
      lucideTrendingUp,
    }),
  ],
  templateUrl: './scenario-compare-page.html',
  styles: `
    /* After each Compare the coverage curve draws itself, like the planner's route, then its points appear. */
    .whatif-line {
      stroke-dasharray: 1;
      animation: whatif-draw 700ms cubic-bezier(0.2, 0, 0, 1) both;
    }
    .whatif-area {
      animation: whatif-fade 500ms ease-out 250ms both;
    }
    .whatif-point {
      animation: whatif-fade 250ms ease-out both;
    }
    @keyframes whatif-draw {
      from {
        stroke-dashoffset: 1;
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes whatif-fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class ScenarioComparePage {
  readonly importId = input.required<string>();

  private readonly api = inject(PlannerService);
  protected readonly id = computed(() => Number(this.importId()));
  protected readonly chart = CHART;
  protected readonly chartPadding = CHART_PADDING;
  protected readonly kpiRows = KPI_ROWS;
  protected readonly maxCompared = MAX_COMPARED;

  private readonly campaignsResource = resource({
    loader: () => this.api.campaigns(new Date().getFullYear()),
  });
  private readonly optionsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.options(params),
  });
  private readonly baseResource = resource({ loader: () => this.api.startingBase() });
  private readonly plansResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.plans(params),
  });

  protected readonly campaigns = computed(() => this.campaignsResource.value() ?? []);
  protected readonly loading = computed(
    () =>
      this.campaignsResource.isLoading() ||
      this.optionsResource.isLoading() ||
      this.baseResource.isLoading() ||
      this.plansResource.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error =
      this.campaignsResource.error() ??
      this.optionsResource.error() ??
      this.baseResource.error() ??
      this.plansResource.error();
    return error ? problemDetail(error) : null;
  });

  /** Saved scenarios, newest first; kept locally so a deletion updates the page without a reload. */
  protected readonly scenarios = signal<PlanSummary[]>([]);
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly compared = computed(() =>
    this.scenarios().filter((scenario) => this.selectedIds().includes(scenario.id)),
  );
  protected readonly best = computed(() => bestColumns(this.compared()));
  protected readonly deleting = signal<number | null>(null);
  protected readonly scenarioError = signal<string | null>(null);

  /** `campaign:<code>` for the planner defaults or `scenario:<id>` for a saved plan. */
  protected readonly source = signal('');
  protected readonly horizonsText = signal(DEFAULT_HORIZONS);
  protected readonly whatIfError = signal<string | null>(null);
  protected readonly running = signal(false);
  protected readonly whatIf = signal<WhatIfResult | null>(null);
  protected readonly curve = computed(() => coverageCurve(this.whatIf()?.rows ?? [], CHART));
  protected readonly curvePath = computed(() =>
    this.curve()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );

  /** The curve closed down to the baseline, for the shaded area under it. */
  protected readonly areaPath = computed(() => {
    const points = this.curve();
    if (!points.length) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${first.x},${this.chart.height} ${this.curvePath()} ${last.x},${this.chart.height}`;
  });

  constructor() {
    effect(() => {
      const plans = this.plansResource.value();
      if (plans) {
        this.scenarios.set(plans);
        this.selectedIds.set(plans.slice(0, MAX_COMPARED).map((plan) => plan.id));
      }
    });
    effect(() => {
      const campaigns = this.campaigns();
      if (campaigns.length && !this.source()) {
        this.source.set(`campaign:${campaigns[0].code}`);
      }
    });
  }

  protected setSource(value: string | null | undefined): void {
    if (value) {
      this.source.set(value);
    }
  }

  protected setHorizons(event: Event): void {
    this.horizonsText.set((event.target as HTMLInputElement).value);
  }

  protected async compareHorizons(): Promise<void> {
    const parsed = parseHorizons(this.horizonsText());
    if ('error' in parsed) {
      this.whatIfError.set(parsed.error);
      return;
    }
    const base = this.baseParameters();
    if (!base) {
      this.whatIfError.set('Choose the plan to analyse.');
      return;
    }
    this.whatIfError.set(null);
    this.running.set(true);
    try {
      this.whatIf.set(await this.api.whatIf(this.id(), { base, horizons: parsed.horizons }));
    } catch (error) {
      this.whatIfError.set(problemDetail(error));
    } finally {
      this.running.set(false);
    }
  }

  protected isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  protected toggleScenario(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id),
    );
  }

  protected selectionFull(): boolean {
    return this.selectedIds().length >= MAX_COMPARED;
  }

  protected async deleteScenario(scenario: PlanSummary): Promise<void> {
    this.scenarioError.set(null);
    this.deleting.set(scenario.id);
    try {
      await this.api.deletePlan(scenario.id);
      this.scenarios.update((items) => items.filter((item) => item.id !== scenario.id));
      this.selectedIds.update((ids) => ids.filter((item) => item !== scenario.id));
      if (this.source() === `scenario:${scenario.id}`) {
        const first = this.campaigns()[0];
        this.source.set(first ? `campaign:${first.code}` : '');
      }
    } catch (error) {
      this.scenarioError.set(problemDetail(error));
    } finally {
      this.deleting.set(null);
    }
  }

  protected isBest(row: KpiRow, column: number): boolean {
    return this.best()[row.key]?.includes(column) ?? false;
  }

  protected kpi(row: KpiRow, kpis: PlanKpis): string {
    const value = Number(kpis[row.key]);
    switch (row.format) {
      case 'eur':
        return formatEur(value, 'rounded');
      case 'percent':
        return PERCENT.format(value);
      case 'km':
        return `${DECIMAL.format(value)} km`;
      case 'hours':
        return `${DECIMAL.format(value)} h`;
      default:
        return String(value);
    }
  }

  protected percent(value: number): string {
    return PERCENT.format(value);
  }

  protected decimal(value: number): string {
    return DECIMAL.format(value);
  }

  protected date(value: string): string {
    return DATE.format(new Date(value));
  }

  protected campaignLabel(parameters: PlanParameters): string {
    return (
      this.campaigns().find((campaign) => campaign.code === parameters.campaign)?.label ??
      'Custom dates'
    );
  }

  protected agentsLabel(parameters: PlanParameters): string {
    if (parameters.planningMode === 'SINGLE_VISITOR') {
      return 'Single visitor';
    }
    return parameters.agents.length ? `Only ${parameters.agents.join(', ')}` : 'All agents';
  }

  protected prioritiesLabel(parameters: PlanParameters): string {
    const weighted = parameters.enterpriseWeights.filter((item) => item.weight !== 1);
    if (!weighted.length) {
      return 'All enterprises, same priority';
    }
    const enterprises = this.optionsResource.value()?.byEnterprise ?? [];
    return weighted
      .map((item) => {
        const name =
          enterprises.find((enterprise) => enterprise.enterpriseId === item.enterpriseId)?.name ??
          `Enterprise ${item.enterpriseId}`;
        return item.weight === 0 ? `${name} excluded` : `${name} ×${DECIMAL.format(item.weight)}`;
      })
      .join(', ');
  }

  private baseParameters(): PlanParameters | null {
    const [kind, value] = this.source().split(':');
    if (kind === 'scenario') {
      return this.scenarios().find((scenario) => scenario.id === Number(value))?.parameters ?? null;
    }
    const preset = this.campaigns().find((campaign) => campaign.code === value);
    if (!preset) {
      return null;
    }
    const saved = this.baseResource.value();
    const enterpriseIds = (this.optionsResource.value()?.byEnterprise ?? []).map(
      (enterprise) => enterprise.enterpriseId,
    );
    return defaultParameters(preset, saved ?? DEFAULT_BASE, enterpriseIds);
  }
}
