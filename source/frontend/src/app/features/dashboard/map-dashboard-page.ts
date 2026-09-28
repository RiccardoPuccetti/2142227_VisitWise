import { Component, computed, inject, input, resource, Resource, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemDetail } from '../../core/auth/problem-detail';
import { EnterpriseLegend, EurPipe, formatEur, KpiCard, MapView } from '../../shared';
import { AmountBars, BarItem } from './amount-bars';
import {
  DashboardFilter,
  filterFromParams,
  filterOptions,
  filterPoints,
  filterToParams,
  pointRevenue,
  shareOfTopFraction,
  toMarkers,
} from './dashboard.model';
import { DashboardService, SummaryFilter } from './dashboard.service';
import { PointDetails } from './point-details';

/** Rows of the points list; the map shows all of them. */
const LIST_LIMIT = 50;
/** A resource's value, or undefined while it loads or when it failed (value() throws in the error state). */
function valueOf<T>(resource: Resource<T | undefined>): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}

const PERCENT = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });

/**
 * Map dashboard of an import (US-13..US-18): delivery points on OpenStreetMap, colored by their main enterprise and
 * sized by revenue, filters kept in the URL, point details, indicators and the list of points (the text alternative
 * of the map).
 */
@Component({
  selector: 'app-map-dashboard-page',
  imports: [
    RouterLink,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmTableImports,
    MapView,
    KpiCard,
    EnterpriseLegend,
    EurPipe,
    AmountBars,
    PointDetails,
  ],
  templateUrl: './map-dashboard-page.html',
})
export class MapDashboardPage {
  /** Route parameter (withComponentInputBinding). */
  readonly importId = input.required<string>();

  private readonly api = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = computed(() => Number(this.importId()));

  protected readonly filter = signal<DashboardFilter>(
    filterFromParams((key) => this.route.snapshot.queryParamMap.get(key)),
  );
  protected readonly selectedId = signal<number | null>(null);

  private readonly pointsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.points(params),
  });

  /** Unfiltered summary: gives the enterprises (legend, filter) and the indicators when no filter applies. */
  private readonly baseSummary = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.summary(params, { enterpriseIds: [], agent: null }),
  });

  /** The part of the filter the summary endpoint applies; equal filters do not reload it. */
  private readonly summaryFilter = computed<SummaryFilter>(
    () => ({ enterpriseIds: this.filter().enterpriseIds, agent: this.filter().agent }),
    { equal: (a, b) => a.agent === b.agent && a.enterpriseIds.join() === b.enterpriseIds.join() },
  );

  private readonly filteredSummary = resource({
    params: () => {
      const filter = this.summaryFilter();
      return filter.enterpriseIds.length || filter.agent ? { id: this.id(), filter } : undefined;
    },
    loader: ({ params }) => this.api.summary(params.id, params.filter),
  });

  protected readonly summary = computed(() => {
    const filter = this.summaryFilter();
    const source =
      filter.enterpriseIds.length || filter.agent ? this.filteredSummary : this.baseSummary;
    return valueOf(source);
  });

  protected readonly loading = computed(() => this.pointsResource.isLoading() || !this.summary());

  protected readonly error = computed(() => {
    const error =
      this.pointsResource.error() ?? this.baseSummary.error() ?? this.filteredSummary.error();
    return error ? problemDetail(error) : null;
  });

  protected readonly enterprises = computed(() => valueOf(this.baseSummary)?.byEnterprise ?? []);
  private readonly allPoints = computed(() => valueOf(this.pointsResource) ?? []);
  protected readonly options = computed(() => filterOptions(this.allPoints()));

  protected readonly filteredPoints = computed(() => filterPoints(this.allPoints(), this.filter()));
  protected readonly markers = computed(() =>
    toMarkers(this.allPoints(), this.enterprises(), this.filter()),
  );
  protected readonly withoutPosition = computed(
    () => this.filteredPoints().length - this.markers().length,
  );

  /** Filtered points, largest revenue (of the selected enterprises) first. */
  protected readonly rows = computed(() =>
    this.filteredPoints()
      .map((point) => ({ point, revenue: pointRevenue(point, this.filter().enterpriseIds) }))
      .sort((a, b) => b.revenue - a.revenue || a.point.id - b.point.id),
  );
  protected readonly listedRows = computed(() => this.rows().slice(0, LIST_LIMIT));

  protected readonly selected = computed(
    () => this.filteredPoints().find((point) => point.id === this.selectedId()) ?? null,
  );

  protected readonly topShare = computed(() => {
    const share = shareOfTopFraction(this.summary()?.pareto ?? [], 0.2);
    return share === null ? '–' : PERCENT.format(share);
  });

  protected readonly enterpriseBars = computed<BarItem[]>(() =>
    (this.summary()?.byEnterprise ?? []).map((e) => ({
      key: String(e.enterpriseId),
      label: e.name,
      revenue: e.revenue,
      pointCount: e.pointCount,
      color: e.color,
    })),
  );
  protected readonly agentBars = computed<BarItem[]>(() =>
    (this.summary()?.byAgent ?? []).map((a) => ({ ...a, label: a.key })),
  );
  protected readonly cityBars = computed<BarItem[]>(() =>
    (this.summary()?.byCity ?? []).map((c) => ({ ...c, label: c.key })),
  );

  protected readonly formatEur = formatEur;

  protected isSelected(enterpriseId: number): boolean {
    return this.filter().enterpriseIds.includes(enterpriseId);
  }

  protected toggleEnterprise(enterpriseId: number): void {
    const ids = this.filter().enterpriseIds;
    const next = ids.includes(enterpriseId)
      ? ids.filter((id) => id !== enterpriseId)
      : [...ids, enterpriseId];
    this.update({ enterpriseIds: next.sort((a, b) => a - b) });
  }

  protected setAgent(value: string | null | undefined): void {
    this.update({ agent: value || null });
  }

  protected setCity(value: string | null | undefined): void {
    this.update({ city: value || null });
  }

  protected setMinRevenue(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.update({ minRevenue: Number.isFinite(value) && value > 0 ? value : 0 });
  }

  protected resetFilters(): void {
    this.update({ enterpriseIds: [], agent: null, city: null, minRevenue: 0 });
  }

  protected select(id: number | string): void {
    this.selectedId.set(Number(id));
  }

  /** Applies a filter change and writes it in the query string (US-15), without a new history entry. */
  private update(change: Partial<DashboardFilter>): void {
    const next = { ...this.filter(), ...change };
    this.filter.set(next);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filterToParams(next),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
