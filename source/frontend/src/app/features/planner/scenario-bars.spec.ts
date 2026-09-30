import { TestBed } from '@angular/core/testing';
import type { PlanKpis, PlanSummary } from '../../core/models/api.models';
import { ScenarioBars } from './scenario-bars';
import { KPI_ROWS } from './scenario-compare.model';

const KPIS: PlanKpis = {
  plannedVisits: 40,
  uniqueCustomers: 36,
  coveredRevenue: 400000,
  eligibleRevenue: 560000,
  coverage: 0.71,
  upperBoundRevenue: 402000,
  totalKm: 400,
  travelHours: 20,
  workingDaysUsed: 20,
  lastVisitDate: '2026-11-27',
  visitsAfterDeadline: 0,
  excludedOutOfRange: 0,
};

function scenario(id: number, name: string, kpis: Partial<PlanKpis>): PlanSummary {
  return {
    id,
    name,
    createdAt: '2026-09-28T10:00:00Z',
    parameters: { workingDays: 20 } as PlanSummary['parameters'],
    kpis: { ...KPIS, ...kpis },
  };
}

describe('ScenarioBars', () => {
  const render = (scenarios: PlanSummary[]) => {
    const fixture = TestBed.createComponent(ScenarioBars);
    fixture.componentRef.setInput('scenarios', scenarios);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const bars = (root: HTMLElement, label: string) =>
    Array.from(
      Array.from(root.querySelectorAll('[data-testid="kpi-bars"]'))
        .find((group) => group.getAttribute('aria-label') === label)!
        .querySelectorAll('[data-testid="kpi-bar"]'),
    ) as HTMLElement[];

  it('draws one row per indicator and one bar per scenario, named in a legend', () => {
    const root = render([scenario(1, 'Short', {}), scenario(2, 'Long', {})]);

    expect(root.querySelectorAll('[data-testid="kpi-bars"]').length).toBe(KPI_ROWS.length);
    expect(bars(root, 'Covered revenue').length).toBe(2);
    expect(root.querySelector('[data-testid="scenario-legend"]')?.textContent).toContain('Short');
    expect(root.querySelector('[data-testid="scenario-legend"]')?.textContent).toContain('Long');
  });

  it('scales each row to its largest value and marks the best one, higher or lower', () => {
    const root = render([
      scenario(1, 'Short', { coveredRevenue: 200000, totalKm: 100 }),
      scenario(2, 'Long', { coveredRevenue: 400000, totalKm: 400 }),
    ]);

    const revenue = bars(root, 'Covered revenue');
    expect(revenue.map((bar) => bar.querySelector('i')!.style.width)).toEqual(['50%', '100%']);
    expect(revenue.map((bar) => bar.getAttribute('data-best'))).toEqual([null, 'true']);

    // Fewer km is better: the short bar wins.
    const distance = bars(root, 'Distance');
    expect(distance.map((bar) => bar.getAttribute('data-best'))).toEqual(['true', null]);
    expect(distance[0].textContent).toContain('100 km');
    expect(root.textContent).toContain('lower is better');
  });

  it('marks nothing as best with a single scenario', () => {
    const root = render([scenario(1, 'Only', {})]);

    expect(root.querySelectorAll('[data-best="true"]').length).toBe(0);
  });
});
