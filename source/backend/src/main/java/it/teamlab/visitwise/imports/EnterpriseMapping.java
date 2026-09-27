package it.teamlab.visitwise.imports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A revenue column of the file: the enterprise it belongs to, its display name and its map color ({@code #RRGGBB}).
 * Limits are those of the {@code enterprise} table.
 */
public record EnterpriseMapping(
        @NotBlank @Size(max = 150) String sourceColumn,
        @NotBlank @Size(max = 100) String name,
        @NotNull @Pattern(regexp = "#[0-9A-Fa-f]{6}", message = "must be a color like #0072B2") String color) {

    public EnterpriseMapping {
        name = name == null ? null : name.strip();
    }
}
