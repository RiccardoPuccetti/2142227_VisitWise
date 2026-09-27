package it.teamlab.visitwise.imports;

import java.util.List;

/**
 * First sheet of an uploaded file: unique header names and the non-blank data rows below them.
 * Every row has exactly one cell per header.
 */
record ParsedSheet(String sheetName, List<String> headers, List<SheetRow> rows) {
}
