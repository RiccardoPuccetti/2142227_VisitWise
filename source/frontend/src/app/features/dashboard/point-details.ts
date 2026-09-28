import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { DeliveryPoint, EnterpriseAmount } from '../../core/models/api.models';
import { EurPipe } from '../../shared';

/**
 * Details of one delivery point (US-17): customer, address, agent and revenue per enterprise.
 * The title takes the focus when a point is shown, so keyboard and screen reader users land on it.
 */
@Component({
  selector: 'app-point-details',
  imports: [HlmCardImports, HlmButtonImports, EurPipe],
  template: `
    <section hlmCard size="sm" class="h-full" aria-labelledby="point-details-title">
      <div hlmCardHeader>
        <span class="eyebrow">Selected point</span>
        <h2 #title id="point-details-title" tabindex="-1" hlmCardTitle class="outline-none">
          {{ point().pointName }}
        </h2>
        <p hlmCardDescription>{{ point().customerName }}</p>
      </div>
      <div hlmCardContent class="flex flex-col gap-4 text-sm">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt class="text-muted-foreground">Address</dt>
          <dd>{{ point().address }}, {{ point().city }}</dd>
          <dt class="text-muted-foreground">Agent</dt>
          <dd>{{ point().agent ?? 'No agent' }}</dd>
        </dl>
        <div class="bg-muted/60 rounded-xl p-3">
          <p class="eyebrow mb-1">Total revenue</p>
          <p class="text-2xl font-semibold tracking-tight tabular-nums">{{ point().totalRevenue | eur }}</p>
        </div>
        <table class="w-full">
          <caption class="sr-only">
            Revenue per enterprise
          </caption>
          <tbody>
            @for (line of lines(); track line.enterpriseId) {
              <tr>
                <th scope="row" class="py-1.5 text-left font-normal">
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="border-foreground/20 size-2.5 rounded-full border"
                      [style.background-color]="line.color"
                      aria-hidden="true"
                    ></span>
                    {{ line.name }}
                  </span>
                </th>
                <td class="py-1.5 text-right font-medium tabular-nums">{{ line.amount | eur }}</td>
              </tr>
              <tr aria-hidden="true">
                <td colspan="2" class="pb-1.5">
                  <div class="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div class="h-full rounded-full" [style.width.%]="line.share" [style.background-color]="line.color"></div>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div hlmCardFooter class="mt-auto">
        <button hlmBtn variant="outline" size="sm" type="button" (click)="closed.emit()">
          Close
        </button>
      </div>
    </section>
  `,
  host: { class: 'block h-full' },
})
export class PointDetails {
  readonly point = input.required<DeliveryPoint>();
  readonly enterprises = input.required<readonly EnterpriseAmount[]>();
  readonly closed = output();

  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  protected readonly lines = computed(() => {
    const byId = new Map(this.enterprises().map((e) => [e.enterpriseId, e]));
    const total = this.point().totalRevenue;
    return this.point().revenues.map((line) => ({
      enterpriseId: line.enterpriseId,
      amount: line.amount,
      share: total > 0 ? Math.max(0, (line.amount / total) * 100) : 0,
      name: byId.get(line.enterpriseId)?.name ?? `Enterprise ${line.enterpriseId}`,
      color: byId.get(line.enterpriseId)?.color ?? 'transparent',
    }));
  });

  constructor() {
    afterRenderEffect(() => {
      this.point();
      this.title().nativeElement.focus();
    });
  }
}
