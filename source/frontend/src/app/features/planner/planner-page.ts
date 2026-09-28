import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type {
  CampaignCode,
  CampaignPreset,
  PlanParameters,
  PlanResult,
  PlanningMode,
} from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { EurPipe, KpiCard, MapView } from '../../shared';
import { DEFAULT_BASE, planMarkers, planRoutes, validateParameters } from './planner.model';
import { PlannerService } from './planner.service';

const PERCENT = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });
const DECIMAL = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function dateLabel(value: string | null): string {
  return value ? DATE.format(new Date(`${value}T00:00:00Z`)) : '–';
}

/** MAR-4 planner: parameters, simulation KPIs, daily route and scenario save. */
@Component({
  selector: 'app-planner-page',
  imports: [
    ReactiveFormsModule,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInputImports,
    HlmNativeSelectImports,
    HlmSpinnerImports,
    HlmTableImports,
    EurPipe,
    KpiCard,
    MapView,
  ],
  templateUrl: './planner-page.html',
})
export class PlannerPage {
  readonly importId = input.required<string>();

  private readonly api = inject(PlannerService);
  protected readonly id = computed(() => Number(this.importId()));
  protected readonly campaignYear = signal(new Date().getFullYear());

  protected readonly form = new FormGroup({
    campaign: new FormControl<CampaignCode>('CHRISTMAS', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true }),
    deadline: new FormControl('', { nonNullable: true }),
    workingDays: new FormControl(20, { nonNullable: true }),
    planningMode: new FormControl<PlanningMode>('PER_AGENT', { nonNullable: true }),
    visitDurationMinutes: new FormControl(210, { nonNullable: true }),
    workdayMinutes: new FormControl(480, { nonNullable: true }),
    averageSpeedKmh: new FormControl(25, { nonNullable: true }),
    roadFactor: new FormControl(1.3, { nonNullable: true }),
    maxDistanceKm: new FormControl(80, { nonNullable: true }),
    travelCostPerKm: new FormControl(2, { nonNullable: true }),
    minRevenue: new FormControl(0, { nonNullable: true }),
  });

  private readonly campaignsResource = resource({
    params: () => this.campaignYear(),
    loader: ({ params }) => this.api.campaigns(params),
  });
  private readonly optionsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.options(params),
  });

  protected readonly campaigns = computed(() => this.campaignsResource.value() ?? []);
  protected readonly enterprises = computed(() => this.optionsResource.value()?.byEnterprise ?? []);
  protected readonly agents = computed(() => this.optionsResource.value()?.byAgent ?? []);
  protected readonly weights = signal<Record<number, number>>({});
  protected readonly selectedAgents = signal<string[]>([]);
  protected readonly result = signal<PlanResult | null>(null);
  protected readonly selectedDayIndex = signal(0);
  protected readonly submitting = signal(false);
  protected readonly saving = signal(false);
  protected readonly validationErrors = signal<string[]>([]);
  protected readonly actionError = signal<string | null>(null);
  protected readonly scenarioName = signal('');
  protected readonly savedMessage = signal<string | null>(null);

  protected readonly loading = computed(
    () => this.campaignsResource.isLoading() || this.optionsResource.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error = this.campaignsResource.error() ?? this.optionsResource.error();
    return error ? problemDetail(error) : null;
  });
  protected readonly selectedDay = computed(
    () => this.result()?.days[this.selectedDayIndex()] ?? null,
  );
  protected readonly markers = computed(() => planMarkers(this.result(), this.selectedDayIndex()));
  protected readonly routes = computed(() => planRoutes(this.result(), this.selectedDayIndex()));

  constructor() {
    effect(() => {
      const campaigns = this.campaigns();
      if (campaigns.length) {
        this.applyPreset(campaigns[0]);
      }
    });
    effect(() => {
      const enterprises = this.enterprises();
      if (enterprises.length) {
        this.weights.update((current) => {
          const next = { ...current };
          for (const enterprise of enterprises) {
            next[enterprise.enterpriseId] ??= 1;
          }
          return next;
        });
      }
    });
  }

  protected setCampaignYear(event: Event): void {
    const year = Number((event.target as HTMLInputElement).value);
    if (Number.isInteger(year) && year >= 1583 && year <= 9999) {
      this.campaignYear.set(year);
    }
  }

  protected setCampaign(event: Event): void {
    const code = (event.target as HTMLSelectElement).value as CampaignCode;
    this.form.controls.campaign.setValue(code);
    const preset = this.campaigns().find((item) => item.code === code);
    if (preset) {
      this.applyPreset(preset);
    }
  }

  protected setWeight(enterpriseId: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.weights.update((items) => ({ ...items, [enterpriseId]: value }));
  }

  protected toggleAgent(agent: string, checked: boolean): void {
    this.selectedAgents.update((items) =>
      checked ? [...new Set([...items, agent])] : items.filter((item) => item !== agent),
    );
  }

  protected selectDay(index: number): void {
    this.selectedDayIndex.set(index);
  }

  protected async simulate(): Promise<void> {
    const parameters = this.parameters();
    const errors = validateParameters(parameters);
    this.validationErrors.set(errors);
    this.actionError.set(null);
    this.savedMessage.set(null);
    if (errors.length) {
      return;
    }
    this.submitting.set(true);
    try {
      this.result.set(await this.api.simulate(this.id(), parameters));
      this.selectedDayIndex.set(0);
    } catch (error) {
      this.actionError.set(problemDetail(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async saveScenario(): Promise<void> {
    const result = this.result();
    const name = this.scenarioName().trim();
    this.savedMessage.set(null);
    if (!result || !name) {
      this.actionError.set('Enter a scenario name.');
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    try {
      const saved = await this.api.save(this.id(), name, result.parameters);
      this.savedMessage.set(`Scenario saved: ${saved.name}.`);
    } catch (error) {
      this.actionError.set(problemDetail(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected setScenarioName(event: Event): void {
    this.scenarioName.set((event.target as HTMLInputElement).value);
  }

  protected percent(value: number): string {
    return PERCENT.format(value);
  }

  protected decimal(value: number): string {
    return DECIMAL.format(value);
  }

  protected date(value: string | null): string {
    return dateLabel(value);
  }

  private applyPreset(preset: CampaignPreset): void {
    this.form.patchValue({
      campaign: preset.code,
      startDate: preset.startDate,
      deadline: preset.endDate,
    });
  }

  private parameters(): PlanParameters {
    const value = this.form.getRawValue();
    return {
      ...value,
      deadline: value.deadline || null,
      enterpriseWeights: this.enterprises().map((enterprise) => ({
        enterpriseId: enterprise.enterpriseId,
        weight: this.weights()[enterprise.enterpriseId] ?? 1,
      })),
      agents: this.selectedAgents(),
      base: DEFAULT_BASE,
    };
  }
}
