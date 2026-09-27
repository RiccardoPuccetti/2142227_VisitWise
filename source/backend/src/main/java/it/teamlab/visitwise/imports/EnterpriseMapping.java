package it.teamlab.visitwise.imports;

/** A revenue column of the file: the enterprise it belongs to, its display name and its map color ({@code #RRGGBB}). */
public record EnterpriseMapping(String sourceColumn, String name, String color) {
}
