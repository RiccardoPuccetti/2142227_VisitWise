import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideDownload, lucideFileSpreadsheet } from '@ng-icons/lucide';
import { applyEach, form, FormField, FormRoot, maxLength, required, validate } from '@angular/forms/signals';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { ImportPreview, ImportSummary } from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { requiredText } from '../auth/text-rules';
import { PageHeader } from '../../shared';
import { uploadProblem } from './import-file';
import {
  draftFromPreview,
  ENTERPRISE_NAME_MAX,
  enterpriseCandidates,
  IMPORT_NAME_MAX,
  ImportDraft,
  isVisibleOnMap,
  toCreateRequest,
} from './import-draft';
import { IMPORT_TEMPLATE_URL, ImportsService } from './imports.service';

type Step = 'upload' | 'columns' | 'enterprises' | 'done';
type FieldKey = 'customer' | 'deliveryPoint' | 'address' | 'city' | 'agent' | 'latitude' | 'longitude';

const EMPTY_DRAFT: ImportDraft = {
  name: '',
  customer: '',
  deliveryPoint: '',
  address: '',
  city: '',
  agent: '',
  latitude: '',
  longitude: '',
  enterprises: [],
};

/** Mapping fields of step 2 (S3), in screen order. */
const FIELDS: readonly { key: FieldKey; label: string; required: boolean; hint: string }[] = [
  { key: 'customer', label: 'Customer', required: true, hint: 'Company name, e.g. "Ragione Sociale"' },
  { key: 'deliveryPoint', label: 'Delivery point', required: true, hint: 'Shop or venue served, e.g. "Punto Vendita"' },
  { key: 'address', label: 'Address', required: true, hint: 'Street and number of the delivery point' },
  { key: 'city', label: 'City', required: true, hint: 'e.g. "Comune"' },
  { key: 'agent', label: 'Agent', required: false, hint: 'Optional: sales agent of the point' },
  { key: 'latitude', label: 'Latitude', required: false, hint: 'Optional: with longitude, the point is not geocoded' },
  { key: 'longitude', label: 'Longitude', required: false, hint: 'Optional: decimal degrees' },
];

/** Only selected columns still offered as enterprises are sent, so only they are validated. */
function isSent(draft: ImportDraft, column: string, selected: boolean): boolean {
  return selected && enterpriseCandidates(draft).some((e) => e.sourceColumn === column);
}

const STEPS: readonly { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'columns', label: 'Columns' },
  { id: 'enterprises', label: 'Enterprises and name' },
];

/**
 * US-01..US-07 - owner: Puccetti (task PUC-5). Import wizard: upload (S2) -> columns (S3) -> enterprises and name
 * (S4) -> report. The file stays in the browser between the steps: the backend reads it for the preview and again
 * for the import, and keeps neither.
 */
@Component({
  selector: 'app-import-wizard-page',
  // Same rhythm as every page: the header and the sections 2rem apart.
  host: { class: 'flex flex-col gap-8' },
  imports: [
    RouterLink,
    FormRoot,
    FormField,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInputImports,
    HlmNativeSelectImports,
    HlmSpinnerImports,
    HlmTableImports,
    NgIcon,
    PageHeader,
  ],
  providers: [provideIcons({ lucideCheck, lucideDownload, lucideFileSpreadsheet })],
  template: `
    <app-page-header title="New import" [trail]="[{ label: 'Imports', link: '/imports' }]">
      <p>Three short steps: upload the ERP export, map its columns, then name the enterprises.</p>
    </app-page-header>

    @if (step() !== 'done') {
      <ol aria-label="Import steps" class="grid gap-3 sm:grid-cols-3">
        @for (item of steps; track item.id; let i = $index) {
          <li
            class="bg-card flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ring-1 ring-border shadow-card"
            [class.border-brand]="item.id === step()"
            [class.ring-brand]="item.id === step()"
            [attr.aria-current]="item.id === step() ? 'step' : null"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
              [class]="stepIndex(item.id) < stepIndex(step()) ? 'bg-success text-success-foreground' : item.id === step() ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'"
              aria-hidden="true"
            >
              @if (stepIndex(item.id) < stepIndex(step())) {
                <ng-icon name="lucideCheck" />
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="flex flex-col">
              <span class="eyebrow">Step {{ i + 1 }}</span>
              <span class="font-medium" [class.text-muted-foreground]="stepIndex(item.id) > stepIndex(step())">{{ item.label }}</span>
            </span>
          </li>
        }
      </ol>
    }

    <section hlmCard aria-labelledby="import-step-title">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="import-step-title" tabindex="-1" #stepTitle class="outline-none">{{ title() }}</h2>
      </div>

      <div hlmCardContent class="flex flex-col gap-6">
        @switch (step()) {
          @case ('upload') {
            <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <label
                for="import-file"
                class="border-input hover:bg-muted/40 focus-within:ring-ring/30 flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-within:ring-3"
                [class.bg-brand-soft]="dragging()"
                [class.border-brand]="dragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="dragging.set(false)"
                (drop)="onDrop($event)"
              >
                <span class="bg-brand-soft text-brand grid size-14 place-items-center rounded-2xl" aria-hidden="true">
                  <ng-icon name="lucideFileSpreadsheet" class="text-2xl" />
                </span>
                <span class="text-lg font-medium">Drop the Excel file here, or choose it</span>
                <span class="text-muted-foreground text-sm">Only .xlsx workbooks, up to 20 MB</span>
                <input
                  id="import-file"
                  type="file"
                  class="sr-only"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  [disabled]="loading()"
                  (change)="onFileInput($event)"
                />
              </label>
              <aside class="bg-muted/40 flex flex-col gap-4 rounded-2xl p-5 text-sm">
                <h3 class="font-semibold">How it works</h3>
                <p class="text-muted-foreground">
                  Upload the yearly ERP export. Columns can have any name and order: you map them in the next step.
                  The file is read and discarded, never stored.
                </p>
                <a hlmBtn variant="outline" size="sm" class="self-start" [href]="templateUrl" download>
                  <ng-icon name="lucideDownload" aria-hidden="true" /> Download the import template
                </a>
              </aside>
            </div>
            @if (loading()) {
              <p role="status" class="flex items-center gap-2 text-sm"><hlm-spinner /> Reading {{ file()?.name }}…</p>
            }
            @if (error(); as message) {
              <div hlmAlert variant="destructive" id="import-error" role="alert">
                <p hlmAlertDescription>{{ message }}</p>
              </div>
            }
          }

          @case ('columns') {
            @if (preview(); as p) {
              <div hlmTableContainer class="max-h-96 overflow-auto rounded-xl border">
                <table hlmTable>
                  <caption hlmTableCaption class="caption-top pb-2 text-left">
                    First {{ p.sampleRows.length }} of {{ p.totalRows }} rows of sheet {{ p.sheetName }} in
                    {{ p.fileName }}
                  </caption>
                  <thead hlmTHead>
                    <tr hlmTr>
                      @for (header of p.headers; track $index) {
                        <th hlmTh scope="col" class="whitespace-nowrap">{{ header }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (row of p.sampleRows; track $index) {
                      <tr hlmTr>
                        @for (cell of row; track $index) {
                          <td hlmTd class="whitespace-nowrap">{{ cell }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <fieldset class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <legend class="mb-2 text-sm font-medium">Which column holds each field? Required fields are marked *</legend>
                @for (item of fields; track item.key) {
                  <div hlmField>
                    <label hlmFieldLabel [for]="'import-field-' + item.key">
                      {{ item.label }}@if (item.required) {<span aria-hidden="true"> *</span>}
                    </label>
                    <hlm-native-select [selectId]="'import-field-' + item.key" [formField]="wizard[item.key]">
                      <option hlmNativeSelectOption value="">{{ item.required ? 'Choose a column' : 'Not in the file' }}</option>
                      @for (header of p.headers; track $index) {
                        <option hlmNativeSelectOption [value]="header">{{ header }}</option>
                      }
                    </hlm-native-select>
                    <p hlmFieldDescription>{{ item.hint }}</p>
                    <hlm-field-error>{{ wizard[item.key]().errors()[0]?.message }}</hlm-field-error>
                  </div>
                }
              </fieldset>

              <div class="flex gap-2">
                <button hlmBtn variant="outline" type="button" (click)="restart()">Back</button>
                <button hlmBtn type="button" (click)="nextFromColumns()">Next</button>
              </div>
            }
          }

          @case ('enterprises') {
            <form [formRoot]="wizard" (submit)="attempted.set(true)" aria-labelledby="import-step-title" class="flex flex-col gap-6">
              <fieldset class="flex flex-col gap-3">
                <legend class="mb-1 text-sm font-medium">Revenue columns</legend>
                <p class="text-muted-foreground text-sm">
                  Select the columns with the yearly revenue of each federation company, then name them and pick
                  their map color.
                </p>
                @for (item of wizard.enterprises; track $index; let i = $index) {
                  @if (isCandidate(item().value().sourceColumn)) {
                    <div
                      class="bg-muted/30 grid items-start gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                      [class.border-brand]="item().value().selected"
                      [attr.data-column]="item().value().sourceColumn"
                    >
                      <div class="flex items-center gap-2 pt-2">
                        <hlm-checkbox [inputId]="'import-enterprise-' + i" [formField]="item.selected" />
                        <label [for]="'import-enterprise-' + i" class="text-sm font-medium break-all">
                          {{ item().value().sourceColumn }}
                        </label>
                      </div>
                      @if (item().value().selected) {
                        <div hlmField>
                          <label hlmFieldLabel [for]="'import-enterprise-name-' + i">Enterprise name</label>
                          <input hlmInput type="text" [id]="'import-enterprise-name-' + i" [formField]="item.name" />
                          <hlm-field-error>{{ item.name().errors()[0]?.message }}</hlm-field-error>
                        </div>
                        <div hlmField>
                          <label hlmFieldLabel [for]="'import-enterprise-color-' + i">Map color</label>
                          <input
                            hlmInput
                            type="color"
                            class="w-16 cursor-pointer p-1"
                            [id]="'import-enterprise-color-' + i"
                            [formField]="item.color"
                          />
                          <hlm-field-error>{{ item.color().errors()[0]?.message }}</hlm-field-error>
                        </div>
                      }
                    </div>
                  }
                }
                @if (attempted() && wizard.enterprises().errors()[0]; as problem) {
                  <p class="text-destructive text-sm" role="alert">{{ problem.message }}</p>
                }
              </fieldset>

              <div hlmField class="max-w-md">
                <label hlmFieldLabel for="import-name">Import name</label>
                <input hlmInput id="import-name" type="text" [formField]="wizard.name" />
                <p hlmFieldDescription>Shown in the imports list, e.g. "Sales 2025 - full year".</p>
                <hlm-field-error>{{ wizard.name().errors()[0]?.message }}</hlm-field-error>
              </div>

              @if (error(); as message) {
                <div hlmAlert variant="destructive" id="import-error" role="alert">
                  <p hlmAlertDescription>{{ message }}</p>
                </div>
              }

              <div class="flex gap-2">
                <button hlmBtn variant="outline" type="button" (click)="goTo('columns')">Back</button>
                <button hlmBtn type="submit" [disabled]="wizard().submitting()">Import</button>
              </div>
              @if (wizard().submitting()) {
                <p role="status" class="flex items-center gap-2 text-sm"><hlm-spinner /> Importing…</p>
              }
            </form>
          }

          @case ('done') {
            @if (summary(); as s) {
              <div class="bg-success/10 text-success flex items-center gap-3 rounded-2xl p-4">
                <span class="bg-success text-success-foreground grid size-10 shrink-0 place-items-center rounded-full" aria-hidden="true">
                  <ng-icon name="lucideCheck" class="text-xl" />
                </span>
                <p class="text-foreground">
                  <span class="font-medium">{{ s.name }}</span> was imported from {{ s.sourceFileName }}.
                </p>
              </div>
              <dl class="grid grid-cols-3 gap-4">
                <div class="bg-muted/40 rounded-2xl p-5">
                  <dt class="text-muted-foreground text-sm">Rows in the file</dt>
                  <dd class="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{{ s.totalRows }}</dd>
                </div>
                <div class="bg-muted/40 rounded-2xl p-5">
                  <dt class="text-muted-foreground text-sm">Imported</dt>
                  <dd class="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-success">{{ s.importedRows }}</dd>
                </div>
                <div class="bg-muted/40 rounded-2xl p-5">
                  <dt class="text-muted-foreground text-sm">Skipped</dt>
                  <dd class="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{{ s.skippedRows }}</dd>
                </div>
              </dl>
              <p class="text-muted-foreground text-sm">
                Skipped rows are subtotals, totals and rows with a missing customer, delivery point, address or city,
                or with a revenue that is not a number. {{ s.geocodedRows }} of {{ s.importedRows }} points already
                have coordinates.
              </p>
              <ul class="flex flex-wrap gap-3 text-sm" aria-label="Enterprises">
                @for (enterprise of s.enterprises; track enterprise.id) {
                  <li class="flex items-center gap-2">
                    <span class="size-3 rounded-full" [style.background-color]="enterprise.color" aria-hidden="true"></span>
                    {{ enterprise.name }}
                  </li>
                }
              </ul>
              <div class="flex gap-2">
                <a hlmBtn [routerLink]="['/imports', s.id]">Open the import</a>
                <button hlmBtn variant="outline" type="button" (click)="restart()">Import another file</button>
              </div>
            }
          }
        }
      </div>
    </section>
  `,
})
export class ImportWizardPage {
  private readonly imports = inject(ImportsService);
  private readonly injector = inject(Injector);
  private readonly stepTitle = viewChild.required<ElementRef<HTMLElement>>('stepTitle');

  protected readonly templateUrl = IMPORT_TEMPLATE_URL;
  protected readonly steps = STEPS;
  protected readonly fields = FIELDS;

  protected stepIndex(step: Step): number {
    return step === 'done' ? STEPS.length : STEPS.findIndex((item) => item.id === step);
  }

  protected readonly step = signal<Step>('upload');
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly summary = signal<ImportSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The enterprises list error is shown only after the first Import click. */
  protected readonly attempted = signal(false);

  protected readonly title = computed(() => {
    switch (this.step()) {
      case 'upload':
        return 'Upload the file';
      case 'columns':
        return 'Map the columns';
      case 'enterprises':
        return 'Enterprises and name';
      default:
        return 'Import saved';
    }
  });

  private readonly draft = signal<ImportDraft>(EMPTY_DRAFT);

  protected readonly wizard = form(
    this.draft,
    (path) => {
      required(path.customer, { message: 'Choose the column with the customer' });
      required(path.deliveryPoint, { message: 'Choose the column with the delivery point' });
      required(path.address, { message: 'Choose the column with the address' });
      required(path.city, { message: 'Choose the column with the city' });
      validate(path.longitude, ({ value, valueOf }) =>
        (value() === '') !== (valueOf(path.latitude) === '')
          ? { kind: 'coordinates', message: 'Choose both latitude and longitude, or neither' }
          : undefined,
      );
      requiredText(path.name, 'Give the import a name');
      maxLength(path.name, IMPORT_NAME_MAX, { message: `Use at most ${IMPORT_NAME_MAX} characters` });
      validate(path.enterprises, ({ valueOf }) => {
        const chosen = enterpriseCandidates(valueOf(path)).filter((e) => e.selected);
        if (chosen.length === 0) {
          return { kind: 'enterprises', message: 'Select at least one enterprise column' };
        }
        const names = new Set<string>();
        for (const enterprise of chosen) {
          const key = enterprise.name.trim().toLowerCase();
          if (names.has(key)) {
            return { kind: 'duplicate', message: `Two enterprises are called "${enterprise.name.trim()}": use different names` };
          }
          names.add(key);
        }
        return undefined;
      });
      applyEach(path.enterprises, (item) => {
        validate(item.name, ({ value, valueOf }) => {
          if (!isSent(valueOf(path), valueOf(item.sourceColumn), valueOf(item.selected))) return undefined;
          if (value().trim() === '') return { kind: 'required', message: 'Enter the name of the enterprise' };
          return value().trim().length > ENTERPRISE_NAME_MAX
            ? { kind: 'maxLength', message: `Use at most ${ENTERPRISE_NAME_MAX} characters` }
            : undefined;
        });
        validate(item.color, ({ value, valueOf }) =>
          isSent(valueOf(path), valueOf(item.sourceColumn), valueOf(item.selected)) && !isVisibleOnMap(value())
            ? { kind: 'contrast', message: 'Too light to be seen on the map: choose a darker color' }
            : undefined,
        );
      });
    },
    {
      submission: {
        action: async () => {
          const file = this.file();
          if (!file) return undefined;
          this.error.set(null);
          try {
            this.summary.set(await this.imports.create(file, toCreateRequest(this.draft())));
            this.goTo('done');
          } catch (error) {
            this.error.set(problemDetail(error));
          }
          return undefined;
        },
      },
    },
  );

  protected isCandidate(column: string): boolean {
    return enterpriseCandidates(this.draft()).some((e) => e.sourceColumn === column);
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0];
    input.value = '';
    if (chosen) void this.upload(chosen);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const dropped = event.dataTransfer?.files[0];
    if (dropped && !this.loading()) void this.upload(dropped);
  }

  private async upload(chosen: File): Promise<void> {
    this.error.set(uploadProblem(chosen));
    if (this.error()) return;
    this.file.set(chosen);
    this.loading.set(true);
    try {
      const preview = await this.imports.preview(chosen);
      this.preview.set(preview);
      this.draft.set(draftFromPreview(preview));
      this.goTo('columns');
    } catch (error) {
      this.error.set(problemDetail(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected nextFromColumns(): void {
    const mapped = FIELDS.map((item) => this.wizard[item.key]);
    mapped.forEach((field) => field().markAsTouched());
    const invalid = mapped.find((field) => field().invalid());
    if (invalid) {
      invalid().focusBoundControl();
      return;
    }
    this.goTo('enterprises');
  }

  protected goTo(step: Step): void {
    this.error.set(null);
    this.step.set(step);
    // Keyboard and screen reader users land on the new step's title.
    afterNextRender(() => this.stepTitle().nativeElement.focus(), { injector: this.injector });
  }

  /** Back to the upload step with nothing chosen. */
  protected restart(): void {
    this.file.set(null);
    this.preview.set(null);
    this.summary.set(null);
    this.attempted.set(false);
    this.draft.set(EMPTY_DRAFT);
    this.wizard().reset();
    this.goTo('upload');
  }
}
