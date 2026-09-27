package it.teamlab.visitwise.analytics;

import java.math.BigDecimal;

/** Revenue and number of points of one enterprise (API_CONTRACT: EnterpriseAmount). */
public record EnterpriseAmount(Long enterpriseId, String name, String color, BigDecimal revenue, int pointCount) {
}
