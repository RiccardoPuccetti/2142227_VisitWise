package it.teamlab.visitwise.imports;

import java.util.List;

/**
 * One data row. {@code sourceRow} is the row number shown by Excel (1-based), {@code cells} are trimmed texts, "" when
 * empty, in header order.
 */
record SheetRow(int sourceRow, List<String> cells) {
}
