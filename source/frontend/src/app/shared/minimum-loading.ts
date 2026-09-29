import { computed, DestroyRef, effect, inject, InjectionToken, type Signal, signal, untracked } from '@angular/core';

/**
 * Shortest time the loading placeholders stay up once shown. 0 by default (tests see the data at once); the app sets
 * it in `app.config.ts`.
 */
export const LOADING_MIN_MS = new InjectionToken<number>('LOADING_MIN_MS', { providedIn: 'root', factory: () => 0 });

/**
 * True while `loading` is, and for at least {@link LOADING_MIN_MS} from the moment it started: a fast answer (e.g.
 * locally) does not flash the placeholders for a few milliseconds. Call it in an injection context (a field
 * initializer of a component).
 */
export function minimumLoading(loading: () => boolean): Signal<boolean> {
  const minimum = inject(LOADING_MIN_MS);
  if (minimum <= 0) {
    return computed(loading);
  }
  // Set as soon as a loading starts, cleared by the timer: already true when the data arrives early.
  const held = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hold = () => {
    clearTimeout(timer);
    held.set(true);
    timer = setTimeout(() => held.set(false), minimum);
  };
  if (untracked(loading)) {
    hold();
  }
  let wasLoading = untracked(loading);
  effect(() => {
    const now = loading();
    if (now && !wasLoading) {
      untracked(hold);
    }
    wasLoading = now;
  });
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  return computed(() => loading() || held());
}
