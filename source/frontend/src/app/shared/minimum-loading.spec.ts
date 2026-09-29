import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LOADING_MIN_MS, minimumLoading } from './minimum-loading';

describe('minimumLoading', () => {
  afterEach(() => vi.useRealTimers());

  const create = (minimum: number, initial = true) => {
    TestBed.configureTestingModule({ providers: [{ provide: LOADING_MIN_MS, useValue: minimum }] });
    const loading = signal(initial);
    const shown = runInInjectionContext(TestBed.inject(Injector), () => minimumLoading(loading));
    TestBed.tick();
    return { loading, shown };
  };

  it('keeps the placeholders up for the minimum time when the data comes back fast', () => {
    vi.useFakeTimers();
    const { loading, shown } = create(450);

    vi.advanceTimersByTime(100);
    loading.set(false);
    TestBed.tick();
    expect(shown()).toBe(true);

    vi.advanceTimersByTime(349);
    expect(shown()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(shown()).toBe(false);
  });

  it('ends with the loading when it took longer than the minimum', () => {
    vi.useFakeTimers();
    const { loading, shown } = create(450);

    vi.advanceTimersByTime(600);
    loading.set(false);
    TestBed.tick();

    expect(shown()).toBe(false);
  });

  it('counts the minimum again for each new loading', () => {
    vi.useFakeTimers();
    const { loading, shown } = create(450, false);
    expect(shown()).toBe(false);

    loading.set(true);
    TestBed.tick();
    expect(shown()).toBe(true);
    vi.advanceTimersByTime(50);
    loading.set(false);
    TestBed.tick();
    vi.advanceTimersByTime(399);
    expect(shown()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(shown()).toBe(false);
  });

  it('follows the loading exactly without a minimum (the default, e.g. in tests)', () => {
    const { loading, shown } = create(0);

    loading.set(false);

    expect(shown()).toBe(false);
  });
});
