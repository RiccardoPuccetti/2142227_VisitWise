import { Component, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, SchemaPath, validate } from '@angular/forms/signals';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import type { DeliveryPoint } from '../../core/models/api.models';
import { problemDetail } from '../../core/auth/problem-detail';
import { parseCoordinate } from './import-detail.model';
import { ImportsService } from './imports.service';

function coordinate(path: SchemaPath<string>, limit: 90 | 180): void {
  validate(path, ({ value }) => {
    const parsed = parseCoordinate(value(), limit);
    return 'error' in parsed ? { kind: 'coordinate', message: parsed.error } : undefined;
  });
}

function valueOf(text: string, limit: 90 | 180): number {
  const parsed = parseCoordinate(text, limit);
  return 'value' in parsed ? parsed.value : NaN;
}

/** US-09: the analyst types the coordinates of a delivery point the geocoder could not find. */
@Component({
  selector: 'app-point-location-form',
  imports: [FormRoot, FormField, HlmAlertImports, HlmButtonImports, HlmFieldImports, HlmInputImports],
  template: `
    <form [formRoot]="locationForm" aria-labelledby="location-title" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 id="location-title" class="text-lg font-semibold">Set the location of {{ point().pointName }}</h2>
        <p class="text-muted-foreground text-sm">
          {{ point().address }}, {{ point().city }}. Copy the coordinates from a map, e.g. 41.9028 and 12.4964.
        </p>
      </div>
      @if (error(); as message) {
        <div hlmAlert variant="destructive" role="alert">
          <p hlmAlertDescription>{{ message }}</p>
        </div>
      }
      <div class="grid gap-4 sm:grid-cols-2">
        <div hlmField>
          <label hlmFieldLabel for="location-latitude">Latitude</label>
          <input
            hlmInput
            id="location-latitude"
            inputmode="decimal"
            autocomplete="off"
            [formField]="locationForm.latitude"
          />
          <hlm-field-error>{{ locationForm.latitude().errors()[0]?.message }}</hlm-field-error>
        </div>
        <div hlmField>
          <label hlmFieldLabel for="location-longitude">Longitude</label>
          <input
            hlmInput
            id="location-longitude"
            inputmode="decimal"
            autocomplete="off"
            [formField]="locationForm.longitude"
          />
          <hlm-field-error>{{ locationForm.longitude().errors()[0]?.message }}</hlm-field-error>
        </div>
      </div>
      <div class="flex gap-2">
        <button hlmBtn type="submit" [disabled]="locationForm().submitting()">Save location</button>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Cancel</button>
      </div>
    </form>
  `,
})
export class PointLocationForm {
  readonly importId = input.required<number>();
  readonly point = input.required<DeliveryPoint>();
  readonly saved = output<DeliveryPoint>();
  readonly cancelled = output<void>();

  private readonly api = inject(ImportsService);
  private readonly model = signal({ latitude: '', longitude: '' });
  protected readonly error = signal<string | null>(null);

  protected readonly locationForm = form(
    this.model,
    (path) => {
      coordinate(path.latitude, 90);
      coordinate(path.longitude, 180);
    },
    {
      submission: {
        action: async () => {
          this.error.set(null);
          const { latitude, longitude } = this.model();
          try {
            const located = await this.api.setLocation(this.importId(), this.point().id, {
              latitude: valueOf(latitude, 90),
              longitude: valueOf(longitude, 180),
            });
            this.saved.emit(located);
          } catch (error) {
            this.error.set(problemDetail(error));
          }
          return undefined;
        },
      },
    },
  );
}
