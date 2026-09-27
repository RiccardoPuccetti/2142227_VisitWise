package it.teamlab.visitwise.analytics;

import java.math.BigDecimal;
import java.util.List;

/** Indicators of an import, possibly filtered by enterprises and agents (API_CONTRACT: AnalyticsSummary, endpoint 10). */
public record AnalyticsSummary(
        BigDecimal totalRevenue,
        int pointCount,
        int customerCount,
        List<EnterpriseAmount> byEnterprise,
        List<NamedAmount> byAgent,
        List<NamedAmount> byCity,
        List<DeliveryPointResponse> topPoints,
        List<ParetoPoint> pareto) {
}
