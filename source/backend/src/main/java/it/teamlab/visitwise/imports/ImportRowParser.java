package it.teamlab.visitwise.imports;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Turns the data rows of a sheet into delivery points with the analyst's mapping (API_CONTRACT.md, parsing rules;
 * US-04, US-07). A row is skipped, and counted, when a required field is empty (this drops the "... Totale" subtotal
 * rows and the grand total), an enterprise cell is not an amount, or a value does not fit its database column.
 */
final class ImportRowParser {

    /** Database limits of {@code delivery_point}. */
    private static final int MAX_NAME = 255;
    private static final int MAX_CITY = 120;
    private static final int MAX_AGENT = 120;

    private ImportRowParser() {
    }

    /**
     * Checks the mapping against the headers of the file; the message names the invalid field like the other
     * validation errors ("mapping.city: ..."). Required fields and formats are checked on the request itself.
     */
    static void checkMapping(List<String> headers, ColumnMapping mapping) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("customer", mapping.customer());
        fields.put("deliveryPoint", mapping.deliveryPoint());
        fields.put("address", mapping.address());
        fields.put("city", mapping.city());
        fields.put("agent", mapping.agent());
        fields.put("latitude", mapping.latitude());
        fields.put("longitude", mapping.longitude());
        for (Map.Entry<String, String> field : fields.entrySet()) {
            requireColumn(headers, "mapping." + field.getKey(), field.getValue());
        }
        if ((mapping.latitude() == null) != (mapping.longitude() == null)) {
            throw new IllegalArgumentException("mapping.longitude: map both latitude and longitude, or neither");
        }

        Set<String> usedColumns = new HashSet<>(fields.values());
        usedColumns.remove(null);
        Set<String> names = new HashSet<>();
        for (int i = 0; i < mapping.enterprises().size(); i++) {
            EnterpriseMapping enterprise = mapping.enterprises().get(i);
            String path = "mapping.enterprises[" + i + "]";
            requireColumn(headers, path + ".sourceColumn", enterprise.sourceColumn());
            if (!usedColumns.add(enterprise.sourceColumn())) {
                throw new IllegalArgumentException(
                        path + ".sourceColumn: column '" + enterprise.sourceColumn() + "' is already used");
            }
            if (!names.add(enterprise.name().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException(
                        path + ".name: '" + enterprise.name() + "' is already the name of another enterprise");
            }
            if (EnterpriseColors.contrastOnWhite(enterprise.color()) < EnterpriseColors.MIN_CONTRAST) {
                throw new IllegalArgumentException(path + ".color: " + enterprise.color()
                        + " is too light to be seen on the map (it needs at least 3:1 contrast on white)");
            }
        }
    }

    private static void requireColumn(List<String> headers, String path, String column) {
        if (column != null && !headers.contains(column)) {
            throw new IllegalArgumentException(path + ": column '" + column + "' is not in the file");
        }
    }

    /** The mapping must have passed {@link #checkMapping}. */
    static ParsedRows parse(ParsedSheet sheet, ColumnMapping mapping) {
        Map<String, Integer> index = new HashMap<>();
        for (int i = 0; i < sheet.headers().size(); i++) {
            index.put(sheet.headers().get(i), i);
        }
        List<ImportRow> rows = new ArrayList<>();
        int skipped = 0;
        for (SheetRow row : sheet.rows()) {
            Optional<ImportRow> parsed = parseRow(row, mapping, index);
            if (parsed.isPresent()) {
                rows.add(parsed.get());
            } else {
                skipped++;
            }
        }
        return new ParsedRows(List.copyOf(rows), skipped);
    }

    private static Optional<ImportRow> parseRow(SheetRow row, ColumnMapping mapping, Map<String, Integer> index) {
        String customer = cell(row, index, mapping.customer());
        String deliveryPoint = cell(row, index, mapping.deliveryPoint());
        String address = cell(row, index, mapping.address());
        String city = cell(row, index, mapping.city());
        String agent = cell(row, index, mapping.agent());
        if (customer.isEmpty() || deliveryPoint.isEmpty() || address.isEmpty() || city.isEmpty()) {
            return Optional.empty();
        }
        if (customer.length() > MAX_NAME || deliveryPoint.length() > MAX_NAME || address.length() > MAX_NAME
                || city.length() > MAX_CITY || agent.length() > MAX_AGENT) {
            return Optional.empty();
        }
        List<BigDecimal> amounts = new ArrayList<>();
        for (EnterpriseMapping enterprise : mapping.enterprises()) {
            Optional<BigDecimal> amount = AmountParser.parse(cell(row, index, enterprise.sourceColumn()));
            if (amount.isEmpty()) {
                return Optional.empty();
            }
            amounts.add(amount.get());
        }
        Double latitude = coordinate(cell(row, index, mapping.latitude()), 90);
        Double longitude = coordinate(cell(row, index, mapping.longitude()), 180);
        boolean located = latitude != null && longitude != null && (latitude != 0 || longitude != 0);
        return Optional.of(new ImportRow(row.sourceRow(), customer, deliveryPoint, address, city,
                agent.isEmpty() ? null : agent, located ? latitude : null, located ? longitude : null,
                List.copyOf(amounts)));
    }

    /** "" for unmapped columns. */
    private static String cell(SheetRow row, Map<String, Integer> index, String column) {
        return column == null ? "" : row.cells().get(index.get(column));
    }

    /** Decimal degrees with '.' or ',', within +/- {@code limit}; null otherwise (the point is then geocoded). */
    private static Double coordinate(String cell, double limit) {
        try {
            double value = Double.parseDouble(cell.replace(',', '.'));
            return Double.isFinite(value) && Math.abs(value) <= limit ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
