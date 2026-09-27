import { Route } from '@angular/router';
import { routes } from './app.routes';
import { authGuard, guestGuard } from './core/auth/auth.guards';

/** Guards the route table itself: a page added later is protected unless it is deliberately public. */
describe('app routes', () => {
  const PUBLIC_PATHS = ['login', 'register'];

  const protectedRoot = routes.find((route) => route.canActivateChild?.includes(authGuard));
  const pages = (list: Route[]): Route[] =>
    list.flatMap((route) => [...(route.loadComponent ? [route] : []), ...pages(route.children ?? [])]);

  it('has one parent route protected by authGuard', () => {
    expect(protectedRoot).toBeDefined();
  });

  it('protects every page except login and register', () => {
    const protectedPages = pages(protectedRoot?.children ?? []);
    const unprotected = pages(routes).filter((page) => !protectedPages.includes(page));

    expect(unprotected.map((page) => page.path).sort()).toEqual([...PUBLIC_PATHS].sort());
  });

  it('shows login and register only to logged-out visitors', () => {
    for (const path of PUBLIC_PATHS) {
      expect(routes.find((route) => route.path === path)?.canActivate).toContain(guestGuard);
    }
  });

  it('has a protected profile page', () => {
    expect(protectedRoot?.children?.some((route) => route.path === 'profile')).toBe(true);
  });
});
