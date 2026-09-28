package it.teamlab.visitwise.planning.engine;

import java.time.LocalDate;

/** Inclusive campaign dates and their available working-day count. */
public record CampaignWindow(
        String code, String label, LocalDate startDate, LocalDate endDate, int workingDays) {
}
