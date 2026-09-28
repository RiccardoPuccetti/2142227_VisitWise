import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AuthService } from '../../core/auth/auth.service';
import { problemDetail } from '../../core/auth/problem-detail';
import { PASSWORD_MAX_LENGTH, requiredText } from '../auth/text-rules';
import { ProfileService } from './profile.service';

/** US-34 - owner: Puccetti (task PUC-9, AUTHENTICATION.md step 7). */
@Component({
  selector: 'app-profile-page',
  imports: [FormRoot, FormField, HlmAlertImports, HlmButtonImports, HlmCardImports, HlmFieldImports, HlmInputImports],
  template: `
    <h1 class="text-2xl font-semibold">Profile</h1>
    <p class="text-muted-foreground mt-1 text-sm">
      Logged in as <span class="text-foreground font-medium">{{ auth.currentTenant()?.email }}</span>
    </p>

    <div class="mt-6 grid max-w-3xl gap-6 md:grid-cols-2">
      <section hlmCard aria-labelledby="profile-name-title">
        <div hlmCardHeader>
          <h2 hlmCardTitle id="profile-name-title">Federation name</h2>
          <p hlmCardDescription>Shown in the header and on exports.</p>
        </div>
        <form hlmCardContent [formRoot]="nameForm" aria-labelledby="profile-name-title" class="flex flex-col gap-4">
          <div hlmField>
            <label hlmFieldLabel for="profile-name">Name</label>
            <input hlmInput id="profile-name" autocomplete="organization" [formField]="nameForm.name" />
            <hlm-field-error>{{ nameForm.name().errors()[0]?.message }}</hlm-field-error>
          </div>
          <p role="status" class="text-sm">{{ nameStatus() }}</p>
          <button hlmBtn type="submit" class="self-start" [disabled]="nameForm().submitting()">Save name</button>
        </form>
      </section>

      <section hlmCard aria-labelledby="profile-password-title">
        <div hlmCardHeader>
          <h2 hlmCardTitle id="profile-password-title">Password</h2>
          <p hlmCardDescription>Changing it logs out every other device.</p>
        </div>
        <form
          hlmCardContent
          [formRoot]="passwordForm"
          aria-labelledby="profile-password-title"
          class="flex flex-col gap-4"
        >
          @if (passwordError(); as message) {
            <div hlmAlert variant="destructive">
              <p hlmAlertDescription>{{ message }}</p>
            </div>
          }
          <!-- Lets password managers know which account the new password belongs to. -->
          <input type="text" class="hidden" autocomplete="username" [value]="auth.currentTenant()?.email ?? ''" readonly aria-hidden="true" tabindex="-1" />
          <div hlmField>
            <label hlmFieldLabel for="profile-current-password">Current password</label>
            <input
              hlmInput
              id="profile-current-password"
              type="password"
              autocomplete="current-password"
              [formField]="passwordForm.currentPassword"
            />
            <hlm-field-error>{{ passwordForm.currentPassword().errors()[0]?.message }}</hlm-field-error>
          </div>
          <div hlmField>
            <label hlmFieldLabel for="profile-new-password">New password</label>
            <input
              hlmInput
              id="profile-new-password"
              type="password"
              autocomplete="new-password"
              [formField]="passwordForm.newPassword"
            />
            <p hlmFieldDescription>At least 8 characters, up to 64.</p>
            <hlm-field-error>{{ passwordForm.newPassword().errors()[0]?.message }}</hlm-field-error>
          </div>
          <p role="status" class="text-sm">{{ passwordStatus() }}</p>
          <button hlmBtn type="submit" class="self-start" [disabled]="passwordForm().submitting()">
            Change password
          </button>
        </form>
      </section>
    </div>
  `,
})
export class ProfilePage {
  private readonly profile = inject(ProfileService);
  protected readonly auth = inject(AuthService);

  protected readonly nameStatus = signal('');
  protected readonly passwordStatus = signal('');
  protected readonly passwordError = signal<string | null>(null);

  private readonly nameModel = signal({ name: this.auth.currentTenant()?.name ?? '' });
  private readonly passwords = signal({ currentPassword: '', newPassword: '' });

  protected readonly nameForm = form(
    this.nameModel,
    (path) => {
      requiredText(path.name, 'Enter the name of your federation');
      maxLength(path.name, 150, { message: 'Use at most 150 characters' });
    },
    {
      submission: {
        action: async (fields) => {
          this.nameStatus.set('');
          try {
            await this.profile.rename({ name: this.nameModel().name.trim() });
          } catch (error) {
            return { kind: 'server', message: problemDetail(error), fieldTree: fields.name };
          }
          this.nameStatus.set('Name saved.');
          return undefined;
        },
      },
    },
  );

  protected readonly passwordForm = form(
    this.passwords,
    (path) => {
      required(path.currentPassword, { message: 'Enter your current password' });
      required(path.newPassword, { message: 'Enter a new password' });
      maxLength(path.newPassword, PASSWORD_MAX_LENGTH, { message: `Use at most ${PASSWORD_MAX_LENGTH} characters` });
    },
    {
      submission: {
        action: async (fields) => {
          this.passwordStatus.set('');
          this.passwordError.set(null);
          try {
            await this.profile.changePassword(this.passwords());
          } catch (error) {
            const message = problemDetail(error);
            if (error instanceof HttpErrorResponse && error.status === 400) {
              const target = message.startsWith('Current password') ? fields.currentPassword : fields.newPassword;
              return { kind: 'server', message, fieldTree: target };
            }
            this.passwordError.set(message);
            return undefined;
          }
          this.passwords.set({ currentPassword: '', newPassword: '' });
          fields().reset();
          this.passwordStatus.set('Password changed. Other devices have been logged out.');
          return undefined;
        },
      },
    },
  );
}
