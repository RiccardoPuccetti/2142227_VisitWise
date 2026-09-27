package it.teamlab.visitwise.analytics;

import java.math.BigDecimal;

/** Revenue and number of points of one agent or city (API_CONTRACT: NamedAmount). */
public record NamedAmount(String key, BigDecimal revenue, int pointCount) {
}
