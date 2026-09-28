package it.teamlab.visitwise.imports;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Revenue cell -> amount in EUR with 2 decimals (API_CONTRACT.md, parsing rules). Empty or {@code -} is 0; both
 * {@code 1.250,50} and {@code 1,250.50} are accepted: when both separators appear the last one is the decimal one, a
 * separator repeated alone is a thousands separator ({@code 1,234,567}), a single one is decimal ({@code 1250,5}).
 */
final class AmountParser {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final Pattern PLAIN_NUMBER = Pattern.compile("[-+]?\\d+(\\.\\d+)?");

    private AmountParser() {
    }

    /** Empty when the cell is not an amount (text, error cell, malformed number). */
    static Optional<BigDecimal> parse(String cell) {
        if (cell == null) {
            return Optional.of(ZERO);
        }
        String value = cell.replace("€", "").replaceAll("[\\s\\u00a0]", "");
        if (value.isEmpty() || value.equals("-")) {
            return Optional.of(ZERO);
        }
        String normalized = normalizeSeparators(value);
        if (normalized == null || !PLAIN_NUMBER.matcher(normalized).matches()) {
            return Optional.empty();
        }
        return Optional.of(new BigDecimal(normalized).setScale(2, RoundingMode.HALF_UP));
    }

    /** Rewrites the number with '.' as the only decimal separator and no thousands separator; null if ambiguous. */
    private static String normalizeSeparators(String value) {
        int lastComma = value.lastIndexOf(',');
        int lastDot = value.lastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0) {
            char decimal = lastComma > lastDot ? ',' : '.';
            char thousands = decimal == ',' ? '.' : ',';
            if (value.indexOf(decimal) != value.lastIndexOf(decimal)) {
                return null;
            }
            return value.replace(String.valueOf(thousands), "").replace(decimal, '.');
        }
        char separator = lastComma >= 0 ? ',' : '.';
        if (value.indexOf(separator) != value.lastIndexOf(separator)) {
            return value.replace(String.valueOf(separator), "");
        }
        return value.replace(',', '.');
    }
}
