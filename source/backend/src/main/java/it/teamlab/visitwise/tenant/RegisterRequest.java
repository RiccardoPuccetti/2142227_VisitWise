package it.teamlab.visitwise.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of POST /api/auth/register (endpoint 20). Password length is checked by {@link PasswordPolicy} (configurable). */
public record RegisterRequest(
        @NotBlank @Size(max = 150) String tenantName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotNull String password) {

    /** Trims name and email before validation; the password is kept exactly as typed. */
    public RegisterRequest {
        tenantName = tenantName == null ? null : tenantName.trim();
        email = email == null ? null : email.trim();
    }

    /** Keeps the password out of logs and error messages. */
    @Override
    public String toString() {
        return "RegisterRequest[tenantName=" + tenantName + ", email=" + email + ", password=***]";
    }
}
