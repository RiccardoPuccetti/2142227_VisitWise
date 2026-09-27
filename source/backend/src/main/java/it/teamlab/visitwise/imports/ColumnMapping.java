package it.teamlab.visitwise.imports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Which Excel header holds each field (API_CONTRACT.md, section 1). Mapping is by header name, so column order does
 * not matter. In a suggestion a field is null when no header matched it; in an import request the four required
 * fields and at least one enterprise must be set (US-04, US-05).
 */
public record ColumnMapping(
        @NotBlank String customer,
        @NotBlank String deliveryPoint,
        @NotBlank String address,
        @NotBlank String city,
        String agent,
        String latitude,
        String longitude,
        @NotEmpty List<@NotNull @Valid EnterpriseMapping> enterprises) {
}
