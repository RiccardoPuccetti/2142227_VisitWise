package it.teamlab.visitwise.imports;

import java.math.BigDecimal;
import java.util.List;

/**
 * A row accepted for import: the mapped fields, the coordinates from the file when valid (both null otherwise) and
 * one amount per mapped enterprise, in mapping order (0.00 for empty cells).
 */
record ImportRow(int sourceRow, String customer, String deliveryPoint, String address, String city, String agent,
        Double latitude, Double longitude, List<BigDecimal> amounts) {
}
