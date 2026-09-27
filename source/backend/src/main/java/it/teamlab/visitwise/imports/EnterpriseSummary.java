package it.teamlab.visitwise.imports;

/** The contract's {@code Enterprise} (API_CONTRACT.md, section 1). */
public record EnterpriseSummary(Long id, String name, String color, String sourceColumn) {

    static EnterpriseSummary of(Enterprise enterprise) {
        return new EnterpriseSummary(enterprise.getId(), enterprise.getName(), enterprise.getColor(),
                enterprise.getSourceColumn());
    }
}
