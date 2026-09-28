import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideKeyRound } from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { problemDetail } from '../../core/auth/problem-detail';
import { PASSWORD_MAX_LENGTH, requiredText } from '../auth/text-rules';
import { PageHeader } from '../../shared';
import { ProfileService } from './profile.service';

/** US-34 - owner: Puccetti (task PUC-9, AUTHENTICATION.md step 7). */
@Component({
  selector: 'app-profile-page',
  imports: [
    FormRoot,
    FormField,
    NgIcon,
    PageHeader,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
  ],
  providers: [provideIcons({ lucideBuilding2, lucideKeyRound })],
  template: `
    <app-page-header title="Profile">
      <p>
        Logged in as <span class="text-foreground font-medium">{{ auth.currentTenant()?.email }}</span>
      </p>
    </app-page-header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] 2xl:grid-cols-[minmax(0,24rem)_1fr]">
      <section hlmCard class="lg:row-span-2" aria-label="Account">
        <div hlmCardContent class="flex flex-col items-center gap-4 py-8 text-center">
          <span class="bg-brand grid size-20 place-items-center rounded-full text-2xl font-semibold text-white shadow-raised" aria-hidden="true">
            {{ initials() }}
          </span>
          <div class="flex flex-col gap-1">
            <p class="text-lg font-semibold tracking-tight">{{ auth.currentTenant()?.name }}</p>
            <p class="text-muted-foreground text-sm">{{ auth.currentTenant()?.email }}</p>
          </div>
          <p class="pill">Federation account</p>
        </div>
      </section>

      <section hlmCard aria-labelledby="profile-name-title">
        <div hlmCardHeader>
          <h2 hlmCardTitle id="profile-name-title" class="flex items-center gap-2">
            <ng-icon name="lucideBuilding2" class="text-brand" aria-hidden="true" /> Federation name
          </h2>
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
          <h2 hlmCardTitle id="profile-password-title" class="flex items-center gap-2">
            <ng-icon name="lucideKeyRound" class="text-brand" aria-hidden="true" /> Password
          </h2>
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

  protected readonly initials = computed(() => {
    const name = this.auth.currentTenant()?.name ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  });

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
