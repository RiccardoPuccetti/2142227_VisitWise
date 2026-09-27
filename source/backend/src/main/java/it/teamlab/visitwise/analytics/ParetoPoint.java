package it.teamlab.visitwise.analytics;

/** Share of revenue (0..1) held by the {@code points} largest delivery points (API_CONTRACT: ParetoPoint). */
public record ParetoPoint(int points, double revenueShare) {
}
