package it.teamlab.visitwise.imports;

import java.util.List;

/** Rows to import and the number of rows skipped (subtotals, invalid rows): together they are all the data rows. */
record ParsedRows(List<ImportRow> rows, int skipped) {
}
