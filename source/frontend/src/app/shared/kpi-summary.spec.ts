import { TestBed } from '@angular/core/testing';
import { KpiSummary } from './kpi-summary';

describe('KpiSummary', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(KpiSummary);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const DETAILS = [
    { label: 'Visits', value: '70', hint: '53 customers', icon: 'lucideMapPin' },
    { label: 'Distance', value: '1601 km', icon: 'lucideRoute' },
  ];

  it('shows the headline figure with its hint, and the other figures as a list of label and value', async () => {
    const el = await render({
      label: 'Covered revenue',
      value: '548.787 €',
      hint: '100% of the eligible revenue',
      details: DETAILS,
    });

    const headline = el.querySelector('[data-testid="kpi-headline"]');
    expect(text(headline?.querySelector('h3') ?? null)).toBe('Covered revenue');
    expect(text(headline)).toContain('548.787 €');
    expect(text(headline)).toContain('100% of the eligible revenue');
    const rows = Array.from(el.querySelectorAll('[data-testid="kpi-details"] > div')).map((row) => [
      text(row.querySelector('dt')),
      text(row.querySelector('dd')),
    ]);
    expect(rows).toEqual([
      ['Visits', '70 53 customers'],
      ['Distance', '1601 km'],
    ]);
  });

  it('draws a bar for the share of the headline, with an accessible name', async () => {
    const el = await render({ label: 'Covered revenue', value: '548.787 €', progress: 0.62, details: DETAILS });

    const bar = el.querySelector('[data-testid="kpi-headline"] [role="progressbar"]');
    expect(bar?.getAttribute('aria-valuenow')).toBe('62');
    expect(bar?.getAttribute('aria-label')).toBe('Covered revenue: 62%');
  });

  it('has no bar when the headline is not a share', async () => {
    const el = await render({ label: 'Revenue', value: '1.000 €', details: DETAILS });

    expect(el.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('shows skeletons and marks the figures busy while loading', async () => {
    const el = await render({ label: 'Revenue', value: '1.000 €', details: DETAILS, loading: true });

    expect(el.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    // The loading shape keeps the lines of the result, so nothing jumps when the figures arrive:
    // value, bar and hint in the headline, value and hint in each detail.
    expect(el.querySelectorAll('[data-testid="kpi-headline"] hlm-skeleton').length).toBe(3);
    const rows = [...el.querySelectorAll('[data-testid="kpi-details"] > div')];
    expect(rows.map((row) => row.querySelectorAll('hlm-skeleton').length)).toEqual(rows.map(() => 2));
    expect(el.textContent).not.toContain('1.000 €');
    expect(el.textContent).not.toContain('1601 km');
  });
});
