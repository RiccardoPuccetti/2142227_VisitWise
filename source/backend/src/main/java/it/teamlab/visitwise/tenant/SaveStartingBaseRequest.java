package it.teamlab.visitwise.tenant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of endpoint 27: the base address typed in the planner, geocoded before saving (US-35). */
public record SaveStartingBaseRequest(
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 120) String city) {
}
