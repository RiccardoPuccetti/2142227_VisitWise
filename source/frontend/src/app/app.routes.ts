import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

/**
 * All feature routes are lazy. Each page belongs to one owner (see booklets/team/TASKS.md):
 * owners replace their placeholder component, they do not need to touch this file.
 * New pages go inside the protected parent route (authGuard) unless they must be public.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Log in - VisitWise',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Register - VisitWise',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
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
        loadComponent: () =>
          import('./features/plans/plan-detail-page').then((m) => m.PlanDetailPage),
      },
      {
        path: 'profile',
        title: 'Profile - VisitWise',
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: 'imports' },
];
