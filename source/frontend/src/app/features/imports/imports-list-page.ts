import { Component, computed, inject, linkedSignal, resource, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCalendar,
  lucideCircleCheck,
  lucideFileSpreadsheet,
  lucideFolderOpen,
  lucideInfo,
  lucideLayoutGrid,
  lucideList,
  lucideMap,
  lucideTrash2,
  lucideUpload,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import type { ImportSummary } from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { formatDateTime, type KpiDetail, KpiSummary, minimumLoading, PageHeader, valueOf } from '../../shared';
import { locatedPercent } from './import-detail.model';
import { importStatusLabel, importStatusVariant } from './import-status';
import { ImportsView, ImportsViewPreference } from './imports-view';
import { ImportsService } from './imports.service';

/**
 * US-10, US-12: the tenant's imports as cards or as a table (the choice is remembered in the browser), each linking
 * to its detail, with delete after a confirmation.
 */
@Component({
  selector: 'app-imports-list-page',
  // Same rhythm as every page: the header and the sections 1.75rem apart.
  host: { class: 'flex flex-col gap-7' },
  imports: [
    NgTemplateOutlet,
    RouterLink,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmProgressImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmToggleGroupImports,
    NgIcon,
    KpiSummary,
    PageHeader,
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCalendar,
      lucideCircleCheck,
      lucideFileSpreadsheet,
      lucideFolderOpen,
      lucideInfo,
      lucideLayoutGrid,
      lucideList,
      lucideMap,
      lucideTrash2,
      lucideUpload,
    }),
  ],
  templateUrl: './imports-list-page.html',
})
export class ImportsListPage {
  private readonly api = inject(ImportsService);
  private readonly preference = inject(ImportsViewPreference);
  private readonly header = viewChild.required(PageHeader);

  protected readonly view = this.preference.view;
  /** The detail labels of the key figures, shown with placeholders while the list loads. */
  protected readonly loadingDetails: KpiDetail[] = [
    { label: 'Imports', value: '', icon: 'lucideFolderOpen' },
    { label: 'Ready to plan', value: '', icon: 'lucideCircleCheck' },
    { label: 'Enterprises', value: '', icon: 'lucideBuilding2' },
  ];

  private readonly importsResource = resource({ loader: () => this.api.list() });

  /** The loaded list, without the imports deleted since. */
  private readonly imports = linkedSignal(() => valueOf(this.importsResource) ?? []);

  protected readonly loading = minimumLoading(this.importsResource.isLoading);
  protected readonly statusVariant = importStatusVariant;
  protected readonly loadError = computed(() => {
    const error = this.importsResource.error();
    return error ? problemDetail(error) : null;
  });

  protected readonly items = computed(() =>
    this.imports().map((item) => ({
      ...item,
      created: formatDateTime(item.createdAt),
      statusLabel: importStatusLabel(item.status),
      locatedPercent: locatedPercent({ total: item.importedRows, located: item.geocodedRows }),
    })),
  );

  protected readonly totals = computed(() => {
    const imports = this.imports();
    return {
      points: imports.reduce((sum, item) => sum + item.importedRows, 0),
      located: imports.reduce((sum, item) => sum + item.geocodedRows, 0),
      ready: imports.filter((item) => item.status === 'READY').length,
      pending: imports.filter((item) => item.status === 'PROCESSING' || item.status === 'GEOCODING').length,
      enterprises: new Set(imports.flatMap((item) => item.enterprises.map((enterprise) => enterprise.name))).size,
    };
  });

  protected readonly deleting = signal<number | null>(null);
  /** The import just deleted: kept after the request, as its card or row fades out once it has left the list. */
  private readonly removed = signal<number | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly message = signal('');

  /**
   * Only a deleted import fades out. Switching between cards and table removes the old view at once, so it does not
   * stay on screen above the new one while it fades.
   */
  protected leaveMotion(item: ImportSummary): string {
    return this.removed() === item.id ? 'motion-leave' : '';
  }

  protected setView(value: unknown): void {
    if (value === 'cards' || value === 'table') {
      this.preference.set(value satisfies ImportsView);
    }
  }

  protected async remove(item: ImportSummary): Promise<void> {
    this.deleting.set(item.id);
    this.deleteError.set(null);
    this.message.set('');
    try {
      await this.api.remove(item.id);
      this.removed.set(item.id);
      this.imports.update((imports) => imports.filter((candidate) => candidate.id !== item.id));
      this.message.set(`${item.name} was deleted.`);
      // The button that opened the dialog is gone: keep the keyboard focus on the page.
      this.header().focusTitle();
    } catch (error) {
      this.deleteError.set(problemDetail(error));
    } finally {
      this.deleting.set(null);
    }
  }
}
