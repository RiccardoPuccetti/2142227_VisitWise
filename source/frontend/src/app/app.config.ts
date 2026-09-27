import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route params (e.g. :importId) arrive as component input()s.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    // Spartan overlays (dialog, select, tooltip...) must render below the toaster.
    provideSpartanHlm(),
  ],
};
