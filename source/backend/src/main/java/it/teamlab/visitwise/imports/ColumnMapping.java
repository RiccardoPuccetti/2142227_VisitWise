package it.teamlab.visitwise.imports;

import java.util.List;

/**
 * Which Excel header holds each field (API_CONTRACT.md, section 1). Mapping is by header name, so column order does
 * not matter. In a suggestion a field is null when no header matched it.
 */
public record ColumnMapping(String customer, String deliveryPoint, String address, String city, String agent,
        String latitude, String longitude, List<EnterpriseMapping> enterprises) {
}
