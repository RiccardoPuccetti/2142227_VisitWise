import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protected pages: logged-out visitors go to /login?returnUrl=<the page they asked for>. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return (
    inject(AuthService).isLoggedIn() ||
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

/** Login and register pages: a logged-in tenant has nothing to do there. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return !inject(AuthService).isLoggedIn() || router.createUrlTree(['/imports']);
};
