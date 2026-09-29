import { readStored, writeStored } from './storage';

describe('browser storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps a value in this browser', () => {
    writeStored('visitwise-test', 'kept');

    expect(readStored('visitwise-test')).toBe('kept');
    expect(readStored('visitwise-missing')).toBeNull();
  });

  it('does nothing, without throwing, when the browser refuses the storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('refused', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('refused', 'SecurityError');
    });

    expect(() => writeStored('visitwise-test', 'kept')).not.toThrow();
    expect(readStored('visitwise-test')).toBeNull();
  });
});
