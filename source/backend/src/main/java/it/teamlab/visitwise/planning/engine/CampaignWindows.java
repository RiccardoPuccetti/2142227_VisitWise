package it.teamlab.visitwise.planning.engine;

import java.time.LocalDate;
import java.util.List;

/** Campaign presets from section 6 of OPTIMIZATION_STRATEGY.md. */
public final class CampaignWindows {

    private final WorkingCalendar calendar = new WorkingCalendar();

    public List<CampaignWindow> presets(int year) {
        LocalDate easter = calendar.easterSunday(year);
        return List.of(
                window("CHRISTMAS", "Before Christmas", LocalDate.of(year, 11, 1), LocalDate.of(year, 12, 19)),
                window("EASTER", "Before Easter", easter.minusDays(42), easter.minusDays(3)),
                window("END_OF_SUMMER", "End of summer", LocalDate.of(year, 8, 25), LocalDate.of(year, 9, 30)));
    }

    public CampaignWindow custom(LocalDate startDate, LocalDate endDate) {
        return window("CUSTOM", "Custom", startDate, endDate);
    }

    private CampaignWindow window(String code, String label, LocalDate startDate, LocalDate endDate) {
        return new CampaignWindow(code, label, startDate, endDate,
                calendar.countWorkingDays(startDate, endDate));
    }
}
