import { Component, computed, inject, linkedSignal, resource, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCalendar,
  lucideFileSpreadsheet,
  lucideCircleCheck,
  lucideFolderOpen,
  lucideLayoutGrid,
  lucideList,
  lucideMap,
  lucideMapPin,
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
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import type { ImportSummary } from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { KpiSummary, PageHeader } from '../../shared';
import { locatedPercent } from './import-detail.model';
import { formatCreatedAt, importStatusLabel } from './import-status';
import { ImportsView, ImportsViewPreference } from './imports-view';
import { ImportsService } from './imports.service';

/**
 * US-10, US-12: the tenant's imports as cards or as a table (the choice is remembered in the browser), each linking
 * to its detail, with delete after a confirmation.
 */
@Component({
  selector: 'app-imports-list-page',
  // Same rhythm as every page: the header and the sections 2rem apart.
  host: { class: 'flex flex-col gap-8' },
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
    HlmSpinnerImports,
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
      lucideFileSpreadsheet,
      lucideCircleCheck,
      lucideFolderOpen,
      lucideLayoutGrid,
      lucideList,
      lucideMap,
      lucideMapPin,
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

  private readonly importsResource = resource({ loader: () => this.api.list() });

  /** The loaded list, without the imports deleted since. */
  private readonly imports = linkedSignal(() =>
    this.importsResource.hasValue() ? this.importsResource.value() : [],
  );

  protected readonly loading = this.importsResource.isLoading;
  protected readonly loadError = computed(() => {
    const error = this.importsResource.error();
    return error ? problemDetail(error) : null;
  });

  protected readonly items = computed(() =>
    this.imports().map((item) => ({
      ...item,
      created: formatCreatedAt(item.createdAt),
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
  protected readonly deleteError = signal<string | null>(null);
  protected readonly message = signal('');

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
