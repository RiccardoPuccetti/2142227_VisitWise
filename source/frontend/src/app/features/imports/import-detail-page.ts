import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideCalendarRange,
  lucideCircleCheck,
  lucideCircleSlash,
  lucideFileSpreadsheet,
  lucideMapPin,
  lucideMapPinned,
  lucideTableProperties,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import type { DeliveryPoint, GeocodingProgress } from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import {
  createPaging,
  EnterpriseLegend,
  EurPipe,
  type KpiDetail,
  KpiSummary,
  MapView,
  PageHeader,
  TablePager,
} from '../../shared';
import {
  geocodeStatusLabel,
  geocodingRunning,
  locatedPercent,
  mappingRows,
  missingAddresses,
  needsLocation,
  territoryMarkers,
} from './import-detail.model';
import { formatCreatedAt, importStatusLabel } from './import-status';
import { ImportsService } from './imports.service';
import { PointLocationForm } from './point-location-form';

/** US-11: how often the page asks for the geocoding progress while it runs. */
export const GEOCODING_POLL_MS = new InjectionToken<number>('GEOCODING_POLL_MS', {
  providedIn: 'root',
  factory: () => 3000,
});

type PointFilter = 'all' | 'missing';

/**
 * Import detail (US-07..US-09, US-11, US-12): the import report and column mapping, the geocoding progress refreshed
 * while it runs, the delivery points with the ones not located placed by hand, and delete.
 */
@Component({
  selector: 'app-import-detail-page',
  // Same rhythm as every page: the header and the sections 1.75rem apart.
  host: { class: 'flex flex-col gap-7' },
  imports: [
    RouterLink,
    NgIcon,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmProgressImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmToggleGroupImports,
    EurPipe,
    MapView,
    PageHeader,
    TablePager,
    KpiSummary,
    EnterpriseLegend,
    PointLocationForm,
  ],
  providers: [
    provideIcons({
      lucideCalendarDays,
      lucideCalendarRange,
      lucideCircleCheck,
      lucideCircleSlash,
      lucideFileSpreadsheet,
      lucideMapPin,
      lucideMapPinned,
      lucideTableProperties,
      lucideUsers,
    }),
  ],
  templateUrl: './import-detail-page.html',
})
export class ImportDetailPage {
  /** Route parameter (withComponentInputBinding). */
  readonly importId = input.required<string>();

  private readonly api = inject(ImportsService);
  private readonly router = inject(Router);
  private readonly pollMs = inject(GEOCODING_POLL_MS);
  private readonly locationPanel = viewChild<ElementRef<HTMLElement>>('locationPanel');
  private readonly pointsTitle = viewChild<ElementRef<HTMLElement>>('pointsTitle');
  /** The "Set location" button that opened the form, to give the focus back to it. */
  private locationTrigger: HTMLElement | null = null;

  protected readonly id = computed(() => Number(this.importId()));

  private readonly detailResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.detail(params),
  });
  private readonly pointsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.points(params),
  });

  protected readonly detail = computed(() =>
    this.detailResource.hasValue() ? this.detailResource.value() : undefined,
  );
  protected readonly loading = computed(() => this.detailResource.isLoading() && !this.detail());
  protected readonly loadError = computed(() => {
    const error = this.detailResource.error();
    return error ? problemDetail(error) : null;
  });

  protected readonly created = computed(() => {
    const detail = this.detail();
    return detail ? formatCreatedAt(detail.createdAt) : '';
  });
  protected readonly statusLabel = computed(() => {
    const detail = this.detail();
    return detail ? importStatusLabel(detail.status) : '';
  });
  /** The detail labels of the key figures, shown with placeholders while the import loads. */
  protected readonly loadingDetails: KpiDetail[] = [
    { label: 'Skipped', value: '', icon: 'lucideCircleSlash' },
    { label: 'Agents', value: '', icon: 'lucideUsers' },
    { label: 'Cities', value: '', icon: 'lucideMapPin' },
  ];
  /** The report figures, as the key figures of the map dashboard: the imported rows lead (US-07, US-11). */
  protected readonly figures = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return null;
    }
    const details: KpiDetail[] = [
      {
        label: 'Skipped',
        value: String(detail.skippedRows),
        hint: 'subtotals, totals and incomplete rows',
        icon: 'lucideCircleSlash',
      },
      { label: 'Agents', value: String(detail.agents.length), icon: 'lucideUsers' },
      { label: 'Cities', value: String(detail.cities.length), icon: 'lucideMapPin' },
    ];
    return {
      value: String(detail.importedRows),
      hint: `of ${detail.totalRows} rows in the file`,
      share: detail.totalRows ? detail.importedRows / detail.totalRows : null,
      details,
    };
  });
  protected readonly mapping = computed(() => {
    const mapping = this.detail()?.mapping;
    return mapping ? mappingRows(mapping) : [];
  });

  // ---------- Geocoding (US-08, US-09) ----------

  protected readonly progress = signal<GeocodingProgress | null>(null);
  protected readonly running = computed(() => geocodingRunning(this.progress()));
  protected readonly percent = computed(() => {
    const progress = this.progress();
    return progress ? locatedPercent(progress) : 0;
  });
  protected readonly missing = computed(() => {
    const progress = this.progress();
    return progress ? missingAddresses(progress) : 0;
  });
  protected readonly retrying = signal(false);
  /** Polls left to see the job start after a retry: it starts in the background, a moment after the 202. */
  private startPolls = 0;
  protected readonly retryError = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------- Points (US-09, US-11) ----------

  /** The loaded points, with the locations set by hand since. */
  private readonly points = linkedSignal(() => (this.pointsResource.hasValue() ? this.pointsResource.value() : []));
  protected readonly filter = signal<PointFilter>('all');
  protected readonly missingCount = computed(
    () => this.points().filter((point) => needsLocation(point.geocodeStatus)).length,
  );
  private readonly shown = computed(() =>
    this.filter() === 'missing' ? this.points().filter((point) => needsLocation(point.geocodeStatus)) : this.points(),
  );
  /** Pages of the list; back to the first page when the filter changes (not when geocoding refreshes it). */
  protected readonly paging = createPaging(this.shown, this.filter);
  protected readonly rows = computed(() =>
    this.paging.rows().map((point) => ({
      point,
      location: geocodeStatusLabel(point.geocodeStatus),
      canLocate: needsLocation(point.geocodeStatus),
    })),
  );
  protected readonly pointsError = computed(() => {
    const error = this.pointsResource.error();
    return error ? problemDetail(error) : null;
  });

  /** Territory preview: the located points on a small map (US-11, US-38). */
  protected readonly territory = computed(() => territoryMarkers(this.points(), this.detail()?.enterprises ?? []));
  protected readonly pointTotal = computed(() => this.points().length);

  protected readonly editing = signal<DeliveryPoint | null>(null);
  protected readonly message = signal('');
  protected readonly deleteError = signal<string | null>(null);
  protected readonly deleting = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.refreshProgress(id));
    });
    inject(DestroyRef).onDestroy(() => this.stopPolling());
  }

  protected setFilter(value: unknown): void {
    if (value === 'all' || value === 'missing') {
      this.filter.set(value);
    }
  }

  protected edit(point: DeliveryPoint, trigger: EventTarget | null): void {
    this.locationTrigger = trigger instanceof HTMLElement ? trigger : null;
    this.message.set('');
    this.editing.set(point);
    // The form appears under the table: move the keyboard focus there.
    setTimeout(() => this.locationPanel()?.nativeElement.focus());
  }

  protected located(point: DeliveryPoint): void {
    this.points.update((points) => points.map((candidate) => (candidate.id === point.id ? point : candidate)));
    this.editing.set(null);
    this.message.set(`${point.pointName} is now on the map.`);
    // Its "Set location" button is gone with the new status: the focus goes to the table heading.
    setTimeout(() => this.pointsTitle()?.nativeElement.focus());
    void this.refreshProgress(this.id());
  }

  protected closeLocation(): void {
    this.editing.set(null);
    this.locationTrigger?.focus();
  }

  protected async retry(): Promise<void> {
    this.retrying.set(true);
    this.retryError.set(null);
    try {
      await this.api.retryGeocoding(this.id());
      this.startPolls = 5;
      await this.refreshProgress(this.id());
    } catch (error) {
      this.retryError.set(problemDetail(error));
    } finally {
      this.retrying.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.api.remove(this.id());
      this.stopPolling();
      await this.router.navigateByUrl('/imports');
    } catch (error) {
      this.deleteError.set(problemDetail(error));
    } finally {
      this.deleting.set(false);
    }
  }

  private async refreshProgress(importId: number): Promise<void> {
    this.stopPolling();
    // Following a run (or a retry that is starting): when it ends, counts and coordinates have changed.
    const following = this.running() || this.startPolls > 0;
    try {
      this.progress.set(await this.api.geocodingProgress(importId));
    } catch {
      this.progress.set(null);
      return;
    }
    if (this.running()) {
      this.startPolls = 0;
    } else if (this.startPolls > 0) {
      // A retry was asked: wait for the job to start, unless it already ended (every address was cached).
      this.startPolls = this.missing() > 0 ? this.startPolls - 1 : 0;
    }
    if (this.running() || this.startPolls > 0) {
      this.pollTimer = setTimeout(() => {
        this.pollTimer = null;
        void this.refreshProgress(importId);
      }, this.pollMs);
    } else if (following) {
      this.detailResource.reload();
      this.pointsResource.reload();
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
