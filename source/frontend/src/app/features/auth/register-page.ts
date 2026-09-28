import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { email, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AuthService } from '../../core/auth/auth.service';
import { problemDetail } from '../../core/auth/problem-detail';
import { AuthLayout } from './auth-layout';
import { PASSWORD_MAX_LENGTH, requiredText } from './text-rules';

/** US-31 - owner: Puccetti (task PUC-9, AUTHENTICATION.md step 7). */
@Component({
  selector: 'app-register-page',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    AuthLayout,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
  ],
  template: `
    <app-auth-layout>
    <section hlmCard class="shadow-raised" aria-labelledby="register-title">
      <div hlmCardHeader class="gap-2">
        <p class="eyebrow">Get started</p>
        <h1 hlmCardTitle id="register-title" class="text-2xl">Register</h1>
        <p hlmCardDescription>One account for your whole federation. Its data stays private to it.</p>
      </div>

      <form hlmCardContent [formRoot]="registerForm" class="flex flex-col gap-5">
        @if (serverError(); as message) {
          <div hlmAlert variant="destructive">
            <p hlmAlertDescription>{{ message }}</p>
          </div>
        }

        <div hlmField>
          <label hlmFieldLabel for="register-name">Federation name</label>
          <input hlmInput id="register-name" autocomplete="organization" [formField]="registerForm.tenantName" />
          <hlm-field-error>{{ registerForm.tenantName().errors()[0]?.message }}</hlm-field-error>
        </div>

        <div hlmField>
          <label hlmFieldLabel for="register-email">Email</label>
          <input hlmInput id="register-email" type="email" autocomplete="email" [formField]="registerForm.email" />
          <hlm-field-error>{{ registerForm.email().errors()[0]?.message }}</hlm-field-error>
        </div>

        <div hlmField>
          <label hlmFieldLabel for="register-password">Password</label>
          <div class="flex items-center gap-2">
            <input
              hlmInput
              id="register-password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              [formField]="registerForm.password"
            />
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              type="button"
              aria-controls="register-password"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
          <p hlmFieldDescription>At least 8 characters, up to 64. A few words with spaces make a strong, easy password.</p>
          <hlm-field-error>{{ registerForm.password().errors()[0]?.message }}</hlm-field-error>
        </div>

        <button hlmBtn size="lg" type="submit" class="mt-1" [disabled]="registerForm().submitting()">
          {{ registerForm().submitting() ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p hlmCardFooter class="text-muted-foreground justify-center border-t pt-5 text-sm">
        Already registered?&nbsp;<a routerLink="/login" class="text-brand font-medium underline-offset-4 hover:underline">Log in</a>
      </p>
    </section>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly account = signal({ tenantName: '', email: '', password: '' });

  protected readonly registerForm = form(
    this.account,
    (path) => {
      requiredText(path.tenantName, 'Enter the name of your federation');
      maxLength(path.tenantName, 150, { message: 'Use at most 150 characters' });
      required(path.email, { message: 'Enter your email' });
      email(path.email, { message: 'Enter a valid email address' });
      required(path.password, { message: 'Choose a password' });
      maxLength(path.password, PASSWORD_MAX_LENGTH, { message: `Use at most ${PASSWORD_MAX_LENGTH} characters` });
    },
    {
      submission: {
        action: async (fields) => {
          this.serverError.set(null);
          try {
            await this.auth.register(this.account());
          } catch (error) {
            const message = problemDetail(error);
            // Errors the user can fix go on their field; anything else on top of the form.
            if (error instanceof HttpErrorResponse && error.status === 409) {
              return { kind: 'server', message, fieldTree: fields.email };
            }
            if (error instanceof HttpErrorResponse && error.status === 400 && message.startsWith('Password')) {
              return { kind: 'server', message, fieldTree: fields.password };
            }
            this.serverError.set(message);
            return undefined;
          }
          await this.router.navigateByUrl('/imports');
          return undefined;
        },
      },
    },
  );
}
