import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarRange,
  lucideEuro,
  lucideGitCompare,
  lucideMap,
  lucideMapPin,
  lucideRoute,
  lucideSparkles,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type {
  CampaignCode,
  CampaignPreset,
  GeocodingProgress,
  PlanParameters,
  PlanResult,
  PlanningMode,
  RouteResponse,
  StartingBase,
} from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { EurPipe, KpiCard, MapView, PageHeader } from '../../shared';
import {
  DEFAULT_BASE,
  baseMarker,
  planMarkers,
  planRoutes,
  travelBasis,
  validateParameters,
} from './planner.model';
import { PlannerService } from './planner.service';

const PERCENT = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });
const DECIMAL = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const GEOCODING_POLL_MS = 3000;

function dateLabel(value: string | null): string {
  return value ? DATE.format(new Date(`${value}T00:00:00Z`)) : '–';
}

/**
 * MAR-4 planner: starting base by address, campaign horizon, simulation KPIs, real road route of the
 * selected day and scenario save. Customers still being geocoded are reported with a progress banner.
 */
@Component({
  selector: 'app-planner-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmCheckboxImports,
    HlmEmptyImports,
    HlmFieldImports,
    HlmInputImports,
    HlmNativeSelectImports,
    HlmSpinnerImports,
    HlmTableImports,
    EurPipe,
    KpiCard,
    MapView,
    PageHeader,
  ],
  providers: [
    provideIcons({ lucideCalendarRange, lucideEuro, lucideGitCompare, lucideMap, lucideMapPin, lucideRoute, lucideSparkles }),
  ],
  templateUrl: './planner-page.html',
})
export class PlannerPage {
  readonly importId = input.required<string>();

  private readonly api = inject(PlannerService);
  private readonly destroyRef = inject(DestroyRef);
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
  protected readonly baseForm = new FormGroup({
    address: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
  });

  private readonly campaignsResource = resource({
    params: () => this.campaignYear(),
    loader: ({ params }) => this.api.campaigns(params),
  });
  private readonly optionsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.options(params),
  });
  private readonly baseResource = resource({ loader: () => this.api.startingBase() });

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

  /** Saved base (or null): the map shows it before any plan exists. */
  protected readonly base = signal<StartingBase | null>(null);
  protected readonly savingBase = signal(false);
  protected readonly baseError = signal<string | null>(null);
  protected readonly baseSaved = signal(false);

  protected readonly progress = signal<GeocodingProgress | null>(null);
  protected readonly retrying = signal(false);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  /** Real road route of the selected day, keyed by day so switching back is instant. */
  private readonly roadRoutes = signal<Record<string, RouteResponse>>({});
  protected readonly routing = signal(false);

  protected readonly loading = computed(
    () =>
      this.campaignsResource.isLoading() ||
      this.optionsResource.isLoading() ||
      this.baseResource.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error =
      this.campaignsResource.error() ?? this.optionsResource.error() ?? this.baseResource.error();
    return error ? problemDetail(error) : null;
  });
  protected readonly selectedDay = computed(
    () => this.result()?.days[this.selectedDayIndex()] ?? null,
  );
  protected readonly road = computed(() => {
    const day = this.selectedDay();
    return day ? (this.roadRoutes()[dayKey(day.date, day.agent)] ?? null) : null;
  });
  protected readonly markers = computed(() =>
    this.result() ? planMarkers(this.result(), this.selectedDayIndex()) : baseMarker(this.base()),
  );
  protected readonly routes = computed(() =>
    planRoutes(this.result(), this.selectedDayIndex(), this.road()),
  );
  protected readonly geocodingActive = computed(() => {
    const progress = this.progress();
    return !!progress && (progress.status === 'GEOCODING' || progress.pending > 0);
  });

  constructor() {
    effect(() => {
      const campaigns = this.campaigns();
      if (campaigns.length && this.form.controls.campaign.value !== 'CUSTOM') {
        this.applyPreset(
          campaigns.find((item) => item.code === this.form.controls.campaign.value) ?? campaigns[0],
        );
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
    effect(() => {
      const saved = this.baseResource.value();
      if (saved) {
        this.base.set(saved);
        this.baseForm.patchValue({ address: saved.address, city: saved.city });
      }
    });
    effect(() => {
      void this.refreshProgress(this.id());
    });
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  protected setCampaignYear(event: Event): void {
    const year = Number((event.target as HTMLInputElement).value);
    if (Number.isInteger(year) && year >= 1583 && year <= 9999) {
      this.campaignYear.set(year);
    }
  }

  protected setCampaign(value: string | null | undefined): void {
    const code = (value || 'CUSTOM') as CampaignCode;
    this.form.controls.campaign.setValue(code);
    const preset = this.campaigns().find((item) => item.code === code);
    if (preset) {
      this.applyPreset(preset);
    }
  }

  protected setPlanningMode(value: string | null | undefined): void {
    this.form.controls.planningMode.setValue((value || 'PER_AGENT') as PlanningMode);
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
    void this.loadRoad();
  }

  /** Endpoint 27: geocodes the typed address and keeps it as the tenant base. */
  protected async saveBase(): Promise<void> {
    const { address, city } = this.baseForm.getRawValue();
    this.baseError.set(null);
    this.baseSaved.set(false);
    if (!address.trim()) {
      this.baseError.set('Enter the address of your starting point.');
      return;
    }
    this.savingBase.set(true);
    try {
      this.base.set(
        await this.api.saveStartingBase({ address: address.trim(), city: city.trim() }),
      );
      this.baseSaved.set(true);
    } catch (error) {
      this.baseError.set(problemDetail(error));
    } finally {
      this.savingBase.set(false);
    }
  }

  protected async retryGeocoding(): Promise<void> {
    this.retrying.set(true);
    this.actionError.set(null);
    try {
      await this.api.retryGeocoding(this.id());
      this.schedulePoll();
    } catch (error) {
      this.actionError.set(problemDetail(error));
    } finally {
      this.retrying.set(false);
    }
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
      this.roadRoutes.set({});
      this.selectedDayIndex.set(0);
      await this.loadRoad();
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

  protected readonly travelBasis = travelBasis;

  protected date(value: string | null): string {
    return dateLabel(value);
  }

  protected minutes(value: number): string {
    const hours = Math.floor(value / 60);
    const rest = Math.round(value % 60);
    return hours ? `${hours} h ${rest} min` : `${rest} min`;
  }

  private applyPreset(preset: CampaignPreset): void {
    this.form.patchValue({
      campaign: preset.code,
      startDate: preset.startDate,
      deadline: preset.endDate,
    });
  }

  /** Endpoint 18: the road route of the selected day; failures keep the straight-line polyline. */
  private async loadRoad(): Promise<void> {
    const result = this.result();
    const day = this.selectedDay();
    if (!result || !day || !day.visits.length) {
      return;
    }
    const key = dayKey(day.date, day.agent);
    if (this.roadRoutes()[key]) {
      return;
    }
    this.routing.set(true);
    try {
      const road = await this.api.route(this.id(), {
        base: result.parameters.base,
        stops: day.visits.map(({ latitude, longitude }) => ({ latitude, longitude })),
        averageSpeedKmh: result.parameters.averageSpeedKmh,
        roadFactor: result.parameters.roadFactor,
      });
      this.roadRoutes.update((items) => ({ ...items, [key]: road }));
    } catch {
      // The estimate drawn from the plan itself is good enough when the routing service is down.
    } finally {
      this.routing.set(false);
    }
  }

  private async refreshProgress(importId: number): Promise<void> {
    try {
      this.progress.set(await this.api.geocodingProgress(importId));
    } catch {
      this.progress.set(null);
      return;
    }
    if (this.geocodingActive()) {
      this.schedulePoll();
    } else {
      this.stopPolling();
    }
  }

  private schedulePoll(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.refreshProgress(this.id()).then(() => {
        if (this.progress() && !this.geocodingActive()) {
          // Geocoding finished: newly located customers become available to the planner.
          this.optionsResource.reload();
        }
      });
    }, GEOCODING_POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private parameters(): PlanParameters {
    const value = this.form.getRawValue();
    const base = this.base();
    return {
      ...value,
      deadline: value.deadline || null,
      enterpriseWeights: this.enterprises().map((enterprise) => ({
        enterpriseId: enterprise.enterpriseId,
        weight: this.weights()[enterprise.enterpriseId] ?? 1,
      })),
      agents: this.selectedAgents(),
      base: base ? { latitude: base.latitude, longitude: base.longitude } : DEFAULT_BASE,
    };
  }
}

function dayKey(date: string, agent: string | null): string {
  return `${date}|${agent ?? ''}`;
}
