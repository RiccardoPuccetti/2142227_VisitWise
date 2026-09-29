import { workingDaysBetween } from './working-calendar';

describe('workingDaysBetween (same calendar as the planner engine)', () => {
  it('counts Monday to Friday, both ends included, skipping public holidays', () => {
    // Christmas 2026: 1 Nov is a Sunday and a holiday, 8 Dec a holiday: the campaign preset says 34.
    expect(workingDaysBetween('2026-11-01', '2026-12-19')).toBe(34);
  });

  it('skips Easter Monday', () => {
    expect(workingDaysBetween('2026-04-06', '2026-04-10')).toBe(4);
  });

  it('has no working days in a weekend or when the end comes before the start', () => {
    expect(workingDaysBetween('2026-11-07', '2026-11-08')).toBe(0);
    expect(workingDaysBetween('2026-11-10', '2026-11-09')).toBe(0);
  });

  it('cannot count without two valid dates', () => {
    expect(workingDaysBetween('', '2026-12-19')).toBeNull();
    expect(workingDaysBetween('2026-11-01', '')).toBeNull();
    expect(workingDaysBetween('2026-02-30', '2026-03-10')).toBeNull();
  });
});
