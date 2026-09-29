import { formatDate, formatDateTime, formatDay, formatDecimal, formatPercent } from './format';

describe('format', () => {
  it('writes shares as Italian percentages, with one decimal or whole', () => {
    expect(formatPercent(0.857)).toBe('85,7%');
    expect(formatPercent(0.857, 0)).toBe('86%');
  });

  it('writes decimals with at most one digit after the comma', () => {
    expect(formatDecimal(610.26)).toBe('610,3');
    expect(formatDecimal(1234)).toBe('1234');
  });

  it('writes calendar days of the API without moving them with the time zone', () => {
    expect(formatDay('2026-11-02')).toBe('Mon 2 Nov');
    expect(formatDate('2026-12-19')).toBe('19 Dec 2026');
  });

  it('writes an instant in the browser time zone with its time', () => {
    const instant = '2026-09-28T10:15:00';
    expect(formatDateTime(instant)).toBe(
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(instant)),
    );
  });
});
