package it.teamlab.visitwise.analytics;

import java.math.BigDecimal;

/** Revenue of a delivery point for one enterprise (API_CONTRACT: RevenueLine). */
public record RevenueLine(Long enterpriseId, BigDecimal amount) {
}
