import { Routes } from '@angular/router';

/**
 * All feature routes are lazy. Each page belongs to one owner (see booklets/team/TASKS.md):
 * owners replace their placeholder component, they do not need to touch this file.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'imports' },
  {
    path: 'imports',
    title: 'Imports - VisitWise',
    loadComponent: () =>
      import('./features/imports/imports-list-page').then((m) => m.ImportsListPage),
  },
  {
    path: 'imports/new',
    title: 'New import - VisitWise',
    loadComponent: () =>
      import('./features/imports/import-wizard-page').then((m) => m.ImportWizardPage),
  },
  {
    path: 'imports/:importId',
    title: 'Import detail - VisitWise',
    loadComponent: () =>
      import('./features/imports/import-detail-page').then((m) => m.ImportDetailPage),
  },
  {
    path: 'imports/:importId/map',
    title: 'Map - VisitWise',
    loadComponent: () =>
      import('./features/dashboard/map-dashboard-page').then((m) => m.MapDashboardPage),
  },
  {
    path: 'imports/:importId/planner',
    title: 'Planner - VisitWise',
    loadComponent: () => import('./features/planner/planner-page').then((m) => m.PlannerPage),
  },
  {
    path: 'imports/:importId/scenarios',
    title: 'Scenarios - VisitWise',
    loadComponent: () =>
      import('./features/planner/scenario-compare-page').then((m) => m.ScenarioComparePage),
  },
  {
    path: 'imports/:importId/plans/:planId',
    title: 'Plan - VisitWise',
    loadComponent: () => import('./features/plans/plan-detail-page').then((m) => m.PlanDetailPage),
  },
  { path: '**', redirectTo: 'imports' },
];
