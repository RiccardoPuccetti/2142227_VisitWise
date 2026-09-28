import { TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(KpiCard);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows label, value and hint', async () => {
    const el = await render({
      label: 'Covered revenue',
      value: '104.141 €',
      hint: '62% of eligible',
    });
    expect(el.querySelector('h3')?.textContent).toContain('Covered revenue');
    expect(el.textContent).toContain('104.141 €');
    expect(el.textContent).toContain('62% of eligible');
  });

  it('omits the hint when there is none', async () => {
    const el = await render({ label: 'Visits', value: '40' });
    expect(el.querySelectorAll('p').length).toBe(1);
  });

  it('shows a skeleton and marks the card busy while loading', async () => {
    const el = await render({ label: 'Visits', value: '40', loading: true });
    expect(el.querySelector('hlm-skeleton')).not.toBeNull();
    expect(el.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(el.textContent).not.toContain('40');
  });
});
