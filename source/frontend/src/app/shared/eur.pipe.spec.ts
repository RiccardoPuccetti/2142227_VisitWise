import { EurPipe, formatEur } from './eur.pipe';

// Intl separates the amount and the symbol with a no-break space.
const NBSP = ' ';

describe('formatEur', () => {
  it('formats with 2 decimals by default, Italian separators', () => {
    expect(formatEur(12345.5)).toBe(`12.345,50${NBSP}€`);
  });

  it('groups the thousands of four-digit amounts too, like the larger ones', () => {
    expect(formatEur(2011.4)).toBe(`2.011,40${NBSP}€`);
    expect(formatEur(2011.4, 'rounded')).toBe(`2.011${NBSP}€`);
  });

  it('keeps the sign of negative amounts (credit notes)', () => {
    expect(formatEur(-104.66)).toBe(`-104,66${NBSP}€`);
  });

  it('rounds to whole euros in rounded format', () => {
    expect(formatEur(571053.35, 'rounded')).toBe(`571.053${NBSP}€`);
  });

  it('shortens large amounts in compact format', () => {
    expect(formatEur(1_200_000, 'compact')).toBe(`1,2${NBSP}Mln${NBSP}€`);
  });

  it('renders missing values as an en dash, never as zero', () => {
    expect(formatEur(null)).toBe('–');
    expect(formatEur(undefined)).toBe('–');
    expect(formatEur(Number.NaN)).toBe('–');
  });
});

describe('EurPipe', () => {
  it('delegates to formatEur', () => {
    const pipe = new EurPipe();
    expect(pipe.transform(830, 'rounded')).toBe(formatEur(830, 'rounded'));
    expect(pipe.transform(null)).toBe('–');
  });
});
