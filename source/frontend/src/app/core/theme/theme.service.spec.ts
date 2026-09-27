import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

/** A controllable `prefers-color-scheme: dark` media query. */
function fakeSystemTheme(dark: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  const query = {
    matches: dark,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.push(listener),
    removeEventListener: () => undefined,
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
  return {
    change(nowDark: boolean) {
      query.matches = nowDark;
      listeners.forEach((listener) => listener({ matches: nowDark }));
    },
  };
}

const html = () => document.documentElement;

/** US-36: light or dark interface. */
describe('ThemeService', () => {
  const create = () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  };

  beforeEach(() => {
    localStorage.clear();
    html().classList.remove('dark');
    // jsdom has no matchMedia: give it one to spy on.
    window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  });

  afterEach(() => vi.restoreAllMocks());

  it('follows the operating system until the user chooses', () => {
    fakeSystemTheme(true);

    const service = create();

    expect(service.theme()).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('uses the theme the user chose before, whatever the operating system says', () => {
    fakeSystemTheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    const service = create();

    expect(service.theme()).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('toggles the theme and remembers the choice in the browser', () => {
    fakeSystemTheme(false);
    const service = create();

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.toggle();
    TestBed.tick();

    expect(html().classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('follows a change of the operating system only while the user has not chosen', () => {
    const system = fakeSystemTheme(false);
    const service = create();

    system.change(true);
    TestBed.tick();
    expect(service.theme()).toBe('dark');

    service.toggle();
    system.change(true);
    TestBed.tick();
    expect(service.theme()).toBe('light');
  });

  it('still works when the browser refuses storage (e.g. private mode)', () => {
    fakeSystemTheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const service = create();
    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);
  });
});
