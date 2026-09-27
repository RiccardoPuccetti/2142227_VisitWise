import { Component, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AuthService } from '../../core/auth/auth.service';
import { problemDetail } from '../../core/auth/problem-detail';
import { safeReturnUrl } from '../../core/auth/return-url';

/** US-32 - owner: Puccetti (task PUC-9, AUTHENTICATION.md step 7). */
@Component({
  selector: 'app-login-page',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
  ],
  template: `
    <section hlmCard class="mx-auto mt-8 max-w-sm" aria-labelledby="login-title">
      <div hlmCardHeader>
        <h1 hlmCardTitle id="login-title">Log in</h1>
        <p hlmCardDescription>Use the email and password of your federation.</p>
      </div>

      <form hlmCardContent [formRoot]="loginForm" class="flex flex-col gap-5">
        @if (serverError(); as message) {
          <div hlmAlert variant="destructive">
            <p hlmAlertDescription>{{ message }}</p>
          </div>
        }

        <div hlmField>
          <label hlmFieldLabel for="login-email">Email</label>
          <input hlmInput id="login-email" type="email" autocomplete="username" [formField]="loginForm.email" />
          <hlm-field-error>{{ loginForm.email().errors()[0]?.message }}</hlm-field-error>
        </div>

        <div hlmField>
          <label hlmFieldLabel for="login-password">Password</label>
          <div class="flex items-center gap-2">
            <input
              hlmInput
              id="login-password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              [formField]="loginForm.password"
            />
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              type="button"
              aria-controls="login-password"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
          <hlm-field-error>{{ loginForm.password().errors()[0]?.message }}</hlm-field-error>
        </div>

        <button hlmBtn type="submit" [disabled]="loginForm().submitting()">
          {{ loginForm().submitting() ? 'Logging in...' : 'Log in' }}
        </button>
      </form>

      <p hlmCardFooter class="text-muted-foreground text-sm">
        New to VisitWise?&nbsp;<a routerLink="/register" class="text-foreground underline underline-offset-4">Register your federation</a>
      </p>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** From the query string (`/login?returnUrl=...`), set by the auth guard and the 401 interceptor. */
  readonly returnUrl = input<string>();

  protected readonly showPassword = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly credentials = signal({ email: '', password: '' });

  protected readonly loginForm = form(
    this.credentials,
    (path) => {
      required(path.email, { message: 'Enter your email' });
      required(path.password, { message: 'Enter your password' });
    },
    {
      submission: {
        action: async () => {
          this.serverError.set(null);
          const { email, password } = this.credentials();
          try {
            await this.auth.login(email, password);
          } catch (error) {
            this.serverError.set(problemDetail(error));
            return undefined;
          }
          await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
          return undefined;
        },
      },
    },
  );
}
