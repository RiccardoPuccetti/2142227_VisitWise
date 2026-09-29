import { Component, input } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { PAGE_SIZES, Paging } from './paging';

/**
 * Pager under a table: rows per page, the range shown, previous / next and a page selector. Every change scrolls
 * `scroller` (the table's scroll box, if any) back to its top.
 *
 * ```html
 * <div hlmTableContainer #scroller class="max-h-[28rem] overflow-y-auto">…@for (row of paging.rows(); …)…</div>
 * <app-table-pager [paging]="paging" idPrefix="points" label="Pages of points" [scroller]="scroller" />
 * ```
 */
@Component({
  selector: 'app-table-pager',
  imports: [HlmButtonImports, HlmLabelImports, HlmNativeSelectImports],
  host: { class: 'block' },
  template: `
    <nav [attr.aria-label]="label()" class="flex flex-wrap items-center justify-between gap-3 border-t px-6 pt-3 text-sm">
      <div class="flex items-center gap-2">
        <label hlmLabel [for]="idPrefix() + '-page-size'" class="font-normal">Rows per page</label>
        <hlm-native-select
          [selectId]="idPrefix() + '-page-size'"
          size="sm"
          [value]="'' + paging().size()"
          (valueChange)="setSize($event)"
        >
          @for (size of sizes; track size) {
            <option hlmNativeSelectOption [value]="'' + size">{{ size }}</option>
          }
        </hlm-native-select>
      </div>
      <p class="text-muted-foreground tabular-nums" aria-live="polite">
        Showing {{ paging().range() }} of {{ paging().total() }}
      </p>
      <div class="flex items-center gap-2">
        <button
          hlmBtn
          size="sm"
          variant="outline"
          type="button"
          [disabled]="paging().page() === 1"
          (click)="goTo(paging().page() - 1)"
        >
          Previous<span class="max-sm:sr-only"> page</span>
        </button>
        <label hlmLabel [for]="idPrefix() + '-page'" class="sr-only">Page</label>
        <span class="flex items-center gap-2">
          <hlm-native-select
            [selectId]="idPrefix() + '-page'"
            size="sm"
            class="shrink-0"
            [value]="'' + paging().page()"
            (valueChange)="goTo($event)"
          >
            @for (number of pageNumbers(); track number) {
              <option hlmNativeSelectOption [value]="'' + number">{{ number }}</option>
            }
          </hlm-native-select>
          <span class="text-muted-foreground whitespace-nowrap tabular-nums">of {{ paging().pages() }}</span>
        </span>
        <button
          hlmBtn
          size="sm"
          variant="outline"
          type="button"
          [disabled]="paging().page() === paging().pages()"
          (click)="goTo(paging().page() + 1)"
        >
          Next<span class="max-sm:sr-only"> page</span>
        </button>
      </div>
    </nav>
  `,
})
export class TablePager {
  readonly paging = input.required<Paging<unknown>>();
  /** Prefix of the ids of the two selects: `<prefix>-page-size` and `<prefix>-page`. */
  readonly idPrefix = input.required<string>();
  /** Accessible name of the pager, e.g. "Pages of points". */
  readonly label = input.required<string>();
  /** The table's scroll box, scrolled back to its top on every change. */
  readonly scroller = input<HTMLElement | null>(null);

  protected readonly sizes = PAGE_SIZES;

  protected pageNumbers(): number[] {
    return Array.from({ length: this.paging().pages() }, (_, index) => index + 1);
  }

  protected setSize(value: string | null | undefined): void {
    const size = Number(value);
    if ((PAGE_SIZES as readonly number[]).includes(size)) {
      this.paging().size.set(size);
      this.toTop();
    }
  }

  protected goTo(value: number | string | null | undefined): void {
    const page = Number(value);
    if (Number.isInteger(page)) {
      this.paging().goTo(page);
      this.toTop();
    }
  }

  private toTop(): void {
    const scroller = this.scroller();
    if (scroller) {
      scroller.scrollTop = 0;
    }
  }
}
