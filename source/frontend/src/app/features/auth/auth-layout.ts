import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarRange, lucideMapPinned, lucideRoute, lucideTrendingUp } from '@ng-icons/lucide';

/**
 * Split layout of the logged-out pages: a brand panel that explains the product on the left (from 1024 px) and the
 * projected form on the right, vertically centred.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCalendarRange, lucideMapPinned, lucideRoute, lucideTrendingUp })],
  template: `
    <div class="grid min-h-[calc(100dvh-8rem)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center xl:grid-cols-[minmax(0,1.3fr)_minmax(0,30rem)]">
      <aside
        class="brand-panel relative hidden overflow-hidden rounded-3xl p-10 text-white lg:flex lg:min-h-[36rem] lg:flex-col lg:justify-between"
        aria-hidden="true"
      >
        <div class="relative flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <ng-icon name="lucideRoute" class="text-2xl" />
          </span>
          <span class="flex flex-col leading-tight">
            <span class="text-lg font-semibold tracking-tight">VisitWise</span>
            <span class="text-sm text-white/70">Smart visit planning</span>
          </span>
        </div>

        <div class="relative flex flex-col gap-8">
          <h2 class="max-w-md text-4xl leading-tight font-semibold tracking-tight text-balance">
            Turn your yearly sales export into the best visit routes.
          </h2>
          <ul class="grid gap-4 sm:grid-cols-3">
            <li class="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <ng-icon name="lucideMapPinned" class="text-xl" />
              <span class="text-sm font-medium">Customers on the map</span>
              <span class="text-xs text-white/70">Every delivery point located, coloured by enterprise.</span>
            </li>
            <li class="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <ng-icon name="lucideCalendarRange" class="text-xl" />
              <span class="text-sm font-medium">Day-by-day plans</span>
              <span class="text-xs text-white/70">Working days, holidays and deadlines already accounted for.</span>
            </li>
            <li class="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <ng-icon name="lucideTrendingUp" class="text-xl" />
              <span class="text-sm font-medium">Revenue first</span>
              <span class="text-xs text-white/70">See how much of the eligible revenue each plan covers.</span>
            </li>
          </ul>
        </div>

        <p class="relative text-xs text-white/60">Built for federations of wine and beverage producers.</p>
      </aside>

      <div class="flex w-full flex-col gap-6 justify-self-center lg:max-w-md">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .brand-panel {
      background:
        radial-gradient(60rem 30rem at 110% -10%, rgb(255 255 255 / 18%), transparent 60%),
        radial-gradient(40rem 26rem at -10% 110%, rgb(0 0 0 / 22%), transparent 60%),
        linear-gradient(160deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 70%, #7a1c07) 100%);
      box-shadow: var(--shadow-raised);
    }
  `,
})
export class AuthLayout {}
