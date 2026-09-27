import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChangePasswordRequest, CurrentTenant, UpdateProfileRequest } from '../../core/models/api.models';
import { AuthService } from '../../core/auth/auth.service';

/** Profile of the logged-in tenant (API_CONTRACT.md endpoints 24-25, US-34). */
@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Renames the tenant; the header shows the new name right away. */
  async rename(request: UpdateProfileRequest): Promise<CurrentTenant> {
    const tenant = await firstValueFrom(this.http.patch<CurrentTenant>('/api/profile', request));
    this.auth.setCurrentTenant(tenant);
    return tenant;
  }

  /** The backend logs out the tenant's other sessions and keeps this one. */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await firstValueFrom(this.http.put<void>('/api/profile/password', request));
  }
}
