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
    <section hlmCard size="sm" aria-labelledby="point-details-title">
      <div hlmCardHeader>
        <h2 #title id="point-details-title" tabindex="-1" hlmCardTitle class="outline-none">
          {{ point().pointName }}
        </h2>
        <p hlmCardDescription>{{ point().customerName }}</p>
      </div>
      <div hlmCardContent class="flex flex-col gap-3 text-sm">
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt class="text-muted-foreground">Address</dt>
          <dd>{{ point().address }}, {{ point().city }}</dd>
          <dt class="text-muted-foreground">Agent</dt>
          <dd>{{ point().agent ?? 'No agent' }}</dd>
        </dl>
        <table class="w-full">
          <caption class="sr-only">
            Revenue per enterprise
          </caption>
          <tbody>
            @for (line of lines(); track line.enterpriseId) {
              <tr>
                <th scope="row" class="py-0.5 text-left font-normal">
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="border-foreground/20 size-2.5 rounded-full border"
                      [style.background-color]="line.color"
                      aria-hidden="true"
                    ></span>
                    {{ line.name }}
                  </span>
                </th>
                <td class="py-0.5 text-right tabular-nums">{{ line.amount | eur }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="border-t font-semibold">
              <th scope="row" class="pt-1 text-left">Total</th>
              <td class="pt-1 text-right tabular-nums">{{ point().totalRevenue | eur }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div hlmCardFooter>
        <button hlmBtn variant="outline" size="sm" type="button" (click)="closed.emit()">
          Close
        </button>
      </div>
    </section>
  `,
})
export class PointDetails {
  readonly point = input.required<DeliveryPoint>();
  readonly enterprises = input.required<readonly EnterpriseAmount[]>();
  readonly closed = output();

  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  protected readonly lines = computed(() => {
    const byId = new Map(this.enterprises().map((e) => [e.enterpriseId, e]));
    return this.point().revenues.map((line) => ({
      enterpriseId: line.enterpriseId,
      amount: line.amount,
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
