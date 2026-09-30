import { TestBed } from '@angular/core/testing';
import { SCENARIOS_VIEW_STORAGE_KEY, ScenariosViewPreference } from './scenarios-view';

describe('ScenariosViewPreference (US-27)', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(ScenariosViewPreference);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('compares the scenarios in a table until the analyst chooses', () => {
    expect(create().view()).toBe('table');
  });

  it('remembers the choice in the browser', () => {
    create().set('chart');

    expect(localStorage.getItem(SCENARIOS_VIEW_STORAGE_KEY)).toBe('chart');
    expect(create().view()).toBe('chart');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(SCENARIOS_VIEW_STORAGE_KEY, 'radar');

    expect(create().view()).toBe('table');
  });
});
