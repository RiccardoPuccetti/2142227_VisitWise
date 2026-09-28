package it.teamlab.visitwise.tenant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of PATCH /api/profile (endpoint 24). */
public record UpdateProfileRequest(@NotBlank @Size(max = 150) String name) {

    /** Trims the name before validation. */
    public UpdateProfileRequest {
        name = name == null ? null : name.trim();
    }
}
