import { TestBed } from '@angular/core/testing';
import { IMPORTS_VIEW_STORAGE_KEY, ImportsViewPreference } from './imports-view';

describe('ImportsViewPreference (US-10)', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(ImportsViewPreference);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows cards until the analyst chooses', () => {
    expect(create().view()).toBe('cards');
  });

  it('remembers the choice in the browser', () => {
    create().set('table');

    expect(localStorage.getItem(IMPORTS_VIEW_STORAGE_KEY)).toBe('table');
    expect(create().view()).toBe('table');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(IMPORTS_VIEW_STORAGE_KEY, 'grid');

    expect(create().view()).toBe('cards');
  });

  it('still works when the browser refuses the storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const preference = create();

    preference.set('table');

    expect(preference.view()).toBe('table');
  });
});
