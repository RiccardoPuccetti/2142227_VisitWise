import { mainEnterpriseColor, NO_REVENUE_COLOR } from './enterprise-color';

describe('mainEnterpriseColor', () => {
  const colors = new Map([
    [21, '#0072B2'],
    [22, '#009E73'],
  ]);

  it('takes the color of the enterprise with the largest revenue at the point', () => {
    const revenues = [
      { enterpriseId: 21, amount: 50 },
      { enterpriseId: 22, amount: 80 },
    ];

    expect(mainEnterpriseColor(revenues, colors)).toBe('#009E73');
  });

  it('looks only at the selected enterprises when some are selected', () => {
    const revenues = [
      { enterpriseId: 21, amount: 50 },
      { enterpriseId: 22, amount: 80 },
    ];

    expect(mainEnterpriseColor(revenues, colors, [21])).toBe('#0072B2');
  });

  it('is grey when no enterprise has a positive revenue there', () => {
    expect(mainEnterpriseColor([{ enterpriseId: 21, amount: -20 }], colors)).toBe(NO_REVENUE_COLOR);
    expect(mainEnterpriseColor([], colors)).toBe(NO_REVENUE_COLOR);
  });
});
