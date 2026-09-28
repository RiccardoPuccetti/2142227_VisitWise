import { TestBed } from '@angular/core/testing';
import { EnterpriseLegend } from './enterprise-legend';

describe('EnterpriseLegend', () => {
  it('lists every enterprise with its color', async () => {
    const fixture = TestBed.createComponent(EnterpriseLegend);
    fixture.componentRef.setInput('enterprises', [
      { name: 'ENTERPRISE A', color: '#2563eb' },
      { name: 'ENTERPRISE B', color: '#dc2626' },
    ]);
    await fixture.whenStable();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');

    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('ENTERPRISE A');
    const swatch = items[1].querySelector('span') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(220, 38, 38)');
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
  });
});
