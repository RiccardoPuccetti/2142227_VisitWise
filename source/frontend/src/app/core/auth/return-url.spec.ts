import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps an internal path with its query string', () => {
    expect(safeReturnUrl('/imports/3/map?enterprise=21')).toBe('/imports/3/map?enterprise=21');
  });

  it('falls back to the imports list when there is nothing to return to', () => {
    expect(safeReturnUrl(null)).toBe('/imports');
    expect(safeReturnUrl(undefined)).toBe('/imports');
    expect(safeReturnUrl('')).toBe('/imports');
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'imports/3',
    ' /imports',
  ])('rejects %s (open redirect)', (value) => {
    expect(safeReturnUrl(value)).toBe('/imports');
  });

  it.each(['/login', '/login?returnUrl=%2Fimports', '/register'])(
    'does not return to the %s page itself',
    (value) => {
      expect(safeReturnUrl(value)).toBe('/imports');
    },
  );
});
