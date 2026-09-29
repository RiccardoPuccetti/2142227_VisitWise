import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarRange,
  lucideCircleDot,
  lucideFilter,
  lucideMapPin,
  lucideMousePointerClick,
  lucidePalette,
  lucideTrendingUp,
  lucideUsers,
} from '@ng-icons/lucide';
import { NgTemplateOutlet } from '@angular/common';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemDetail } from '../../core/auth/problem-detail';
import type { AnalyticsSummary } from '../../core/models/api.models';
import {
  AreaChart,
  ChartPoint,
  DonutChart,
  DonutSlice,
  EnterpriseLegend,
  EurPipe,
  formatEur,
  formatPercent,
  KpiSummary,
  MapView,
  minimumLoading,
  createPaging,
  PageHeader,
  POPUP_GAP,
  TablePager,
  valueOf,
} from '../../shared';
import { AmountBars, BarItem } from './amount-bars';
import {
  DashboardFilter,
  EMPTY_FILTER,
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

/**
 * From this width (Tailwind lg, where the app shell shows its desktop sidebar) the selected point opens in a popup on
 * the map instead of a card below it. The filters rail starts later, at xl.
 */
const WIDE_QUERY = '(min-width: 64rem)';
/** Width of the popup (w-80) plus its gap to the marker and a margin to the map edge, in pixels. */
const POPUP_SPACE = 320 + POPUP_GAP + 16;


/** Points of the concentration curve: enough to show the bend, few enough to label. */
const PARETO_STEPS = 6;

/**
 * Map dashboard of an import (US-13..US-18): delivery points on OpenStreetMap, colored by their main enterprise and
 * sized by revenue, filters kept in the URL, point details, indicators and the list of points (the text alternative
 * of the map).
 */
@Component({
  selector: 'app-map-dashboard-page',
  // Same rhythm as every page: the header and the sections 1.75rem apart.
  host: { class: 'flex flex-col gap-7' },
  imports: [
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmSkeletonImports,
    HlmTableImports,
    MapView,
    KpiSummary,
    PageHeader,
    EnterpriseLegend,
    EurPipe,
    AmountBars,
    DonutChart,
    AreaChart,
    PointDetails,
    TablePager,
  ],
  providers: [
    provideIcons({
      lucideCalendarRange,
      lucideCircleDot,
      lucideFilter,
      lucideMapPin,
      lucideMousePointerClick,
      lucidePalette,
      lucideTrendingUp,
      lucideUsers,
    }),
  ],
  templateUrl: './map-dashboard-page.html',
})
export class MapDashboardPage {
  /** Route parameter (withComponentInputBinding). */
  readonly importId = input.required<string>();

  private readonly api = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly mapView = viewChild(MapView);

  /** Wide screen: the selected point opens in a popup anchored to its marker. */
  protected readonly wide = signal(globalThis.matchMedia?.(WIDE_QUERY).matches ?? false);

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

  /** The summary for the current filter, or the previous one while it loads, so the charts do not empty and refill. */
  protected readonly summary = linkedSignal<AnalyticsSummary | undefined, AnalyticsSummary | undefined>({
    source: () => {
      const filter = this.summaryFilter();
      return valueOf(filter.enterpriseIds.length || filter.agent ? this.filteredSummary : this.baseSummary);
    },
    computation: (next, previous) => next ?? previous?.value,
  });
  /** A filtered summary is loading while the previous figures stay on screen. */
  protected readonly refreshing = computed(() => this.filteredSummary.isLoading());

  /** Until the points and the first indicators are there; a failed request ends it (the alert shows instead). */
  protected readonly loading = minimumLoading(
    () =>
      this.pointsResource.isLoading() ||
      (!this.summary() && !this.baseSummary.error() && !this.filteredSummary.error()),
  );

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

  /** Pages of the list; back to the first page when the filter changes. */
  protected readonly paging = createPaging(this.rows, this.filter);

  protected readonly selected = computed(
    () => this.filteredPoints().find((point) => point.id === this.selectedId()) ?? null,
  );
  /** The selected point is shown in the map popup (wide screen and a marker to anchor it to). */
  protected readonly popupOnMap = computed(
    () => this.wide() && this.selected() !== null && this.markers().some((marker) => marker.id === this.selectedId()),
  );

  protected readonly topShare = computed(() => {
    const share = shareOfTopFraction(this.summary()?.pareto ?? [], 0.2);
    return share === null ? '–' : formatPercent(share);
  });

  protected readonly agentBars = computed<BarItem[]>(() =>
    (this.summary()?.byAgent ?? []).map((a) => ({ ...a, label: a.key })),
  );
  protected readonly cityBars = computed<BarItem[]>(() =>
    (this.summary()?.byCity ?? []).map((c) => ({ ...c, label: c.key })),
  );

  protected readonly enterpriseSlices = computed<DonutSlice[]>(() =>
    (this.summary()?.byEnterprise ?? []).map((e) => ({
      key: String(e.enterpriseId),
      label: e.name,
      value: e.revenue,
      color: e.color,
    })),
  );

  /** Concentration curve: cumulative revenue share at evenly spaced shares of the points, from 0 to 100%. */
  protected readonly paretoCurve = computed<ChartPoint[]>(() => {
    const pareto = this.summary()?.pareto ?? [];
    const total = pareto.length;
    if (total === 0) {
      return [];
    }
    const steps = Math.min(PARETO_STEPS, total);
    const points: ChartPoint[] = [{ label: '0%', value: 0 }];
    for (let step = 1; step <= steps; step++) {
      const index = Math.min(total - 1, Math.round((step / steps) * total) - 1);
      const entry = pareto[index];
      points.push({ label: formatPercent(entry.points / total, 0), value: entry.revenueShare });
    }
    return points;
  });

  /** How many filters differ from the default, shown next to the filter title. */
  protected readonly activeFilters = computed(() => {
    const filter = this.filter();
    return (
      (filter.enterpriseIds.length > 0 ? 1 : 0) +
      (filter.agent ? 1 : 0) +
      (filter.city ? 1 : 0) +
      (filter.minRevenue > 0 ? 1 : 0)
    );
  });

  protected readonly filterHint = computed(() => {
    const filter = this.summaryFilter();
    if (filter.enterpriseIds.length === 0 && !filter.agent) {
      return 'whole import';
    }
    const parts: string[] = [];
    if (filter.enterpriseIds.length > 0) {
      parts.push(`${filter.enterpriseIds.length} ${filter.enterpriseIds.length === 1 ? 'enterprise' : 'enterprises'}`);
    }
    if (filter.agent) {
      parts.push(filter.agent);
    }
    return parts.join(' · ');
  });

  protected readonly formatEur = formatEur;
  protected readonly formatCompact = (value: number): string => formatEur(value, 'compact');
  protected readonly wholePercent = (value: number): string => formatPercent(value, 0);

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
    this.update(EMPTY_FILTER);
  }

  constructor() {
    const query = globalThis.matchMedia?.(WIDE_QUERY);
    const update = (event: MediaQueryListEvent) => this.wide.set(event.matches);
    query?.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => query?.removeEventListener('change', update));
  }

  /** Selects a point and brings its marker to the middle of the map (left of the popup on wide screens). */
  protected select(id: number | string): void {
    this.selectedId.set(Number(id));
    this.mapView()?.centerOn(Number(id), this.wide() ? [0, POPUP_SPACE, 0, 0] : [0, 0, 0, 0]);
  }

  /** A marker was clicked: select its point, turn the list to its page and scroll the list (not the page) to its row. */
  protected selectOnMap(id: number | string): void {
    this.select(id);
    const index = this.rows().findIndex((row) => row.point.id === Number(id));
    if (index < 0) {
      return;
    }
    this.paging.showIndex(index);
    afterNextRender({ read: () => this.scrollToRow(Number(id)) }, { injector: this.injector });
  }

  /** Centers the row in the visible part of the list, below the sticky header. */
  private scrollToRow(id: number): void {
    const scroller = this.scroller()?.nativeElement;
    const row = scroller?.querySelector<HTMLElement>(`tr[data-point-id="${id}"]`);
    if (!scroller || !row) {
      return;
    }
    const header = scroller.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const rowTop = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const visible = scroller.clientHeight - header;
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    scroller.scrollTo({
      top: Math.max(0, rowTop - header - (visible - row.offsetHeight) / 2),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
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
