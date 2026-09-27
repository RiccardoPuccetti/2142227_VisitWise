import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route params (e.g. :importId) arrive as component input()s.
    provideRouter(routes, withComponentInputBinding()),
    // authInterceptor: a 401 from the API means the session ended -> login page.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Know who is logged in before the first route guard runs.
    provideAppInitializer(() => inject(AuthService).loadSession()),
  ],
};
