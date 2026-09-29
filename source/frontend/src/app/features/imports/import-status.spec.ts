import { importStatusVariant } from './import-status';

describe('importStatusVariant', () => {
  it('marks a failed import as destructive, a ready one as outline and the running ones as secondary', () => {
    expect(importStatusVariant('FAILED')).toBe('destructive');
    expect(importStatusVariant('READY')).toBe('outline');
    expect(importStatusVariant('GEOCODING')).toBe('secondary');
    expect(importStatusVariant('PROCESSING')).toBe('secondary');
  });
});
