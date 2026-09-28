import { TestBed } from '@angular/core/testing';
import { SIDEBAR_STORAGE_KEY, SidebarPreference } from './sidebar-preference';

describe('SidebarPreference (US-38)', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(SidebarPreference);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts expanded', () => {
    expect(create().collapsed()).toBe(false);
  });

  it('remembers a collapsed sidebar in the browser', () => {
    create().toggle();

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed');
    expect(create().collapsed()).toBe(true);
  });

  it('expands again', () => {
    const preference = create();
    preference.toggle();
    preference.toggle();

    expect(preference.collapsed()).toBe(false);
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded');
  });

  it('still works when the browser refuses the storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const preference = create();

    preference.toggle();

    expect(preference.collapsed()).toBe(true);
  });
});
