package it.teamlab.visitwise.tenant;

import jakarta.validation.constraints.NotNull;

/** Body of PUT /api/profile/password (endpoint 25). The new password is checked by {@link PasswordPolicy}. */
public record ChangePasswordRequest(@NotNull String currentPassword, @NotNull String newPassword) {

    /** Keeps both passwords out of logs and error messages. */
    @Override
    public String toString() {
        return "ChangePasswordRequest[currentPassword=***, newPassword=***]";
    }
}
