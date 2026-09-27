package it.teamlab.visitwise.imports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Part {@code request} of endpoint 3 (US-06: name required, at most 150 characters). */
public record CreateImportRequest(@NotBlank @Size(max = 150) String name, @NotNull @Valid ColumnMapping mapping) {

    public CreateImportRequest {
        name = name == null ? null : name.strip();
    }
}
