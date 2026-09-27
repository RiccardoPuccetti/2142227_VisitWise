package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class CampaignWindowsTest {

    private final CampaignWindows campaigns = new CampaignWindows();

    @ParameterizedTest
    @ValueSource(ints = {2026, 2027, 2032})
    void returnsTheThreePresetsInStableOrderForTheRequestedYear(int year) {
        var presets = campaigns.presets(year);
        assertThat(presets).extracting(CampaignWindow::code)
                .containsExactly("CHRISTMAS", "EASTER", "END_OF_SUMMER");
        assertThat(presets.get(0).startDate()).isEqualTo(LocalDate.of(year, 11, 1));
        assertThat(presets.get(0).endDate()).isEqualTo(LocalDate.of(year, 12, 19));
        assertThat(presets.get(2).startDate()).isEqualTo(LocalDate.of(year, 8, 25));
        assertThat(presets.get(2).endDate()).isEqualTo(LocalDate.of(year, 9, 30));
    }

    @Test
    void matchesTheChristmasContractExample() {
        var christmas = campaigns.presets(2026).getFirst();
        assertThat(christmas.label()).isEqualTo("Before Christmas");
        assertThat(christmas.workingDays()).isEqualTo(34);
    }

    @ParameterizedTest
    @CsvSource({"2026, 2026-02-22, 2026-04-02", "2027, 2027-02-14, 2027-03-25"})
    void computesEasterWindowFromSixWeeksBeforeToThreeDaysBefore(
            int year, LocalDate start, LocalDate end) {
        var easter = campaigns.presets(year).get(1);
        assertThat(easter.startDate()).isEqualTo(start);
        assertThat(easter.endDate()).isEqualTo(end);
        assertThat(easter.workingDays()).isEqualTo(29);
    }

    @Test
    void preservesCustomDatesAcrossYearsAndCountsOnlyWorkingDays() {
        var custom = campaigns.custom(LocalDate.of(2026, 12, 24), LocalDate.of(2027, 1, 6));
        assertThat(custom.code()).isEqualTo("CUSTOM");
        assertThat(custom.startDate()).isEqualTo(LocalDate.of(2026, 12, 24));
        assertThat(custom.endDate()).isEqualTo(LocalDate.of(2027, 1, 6));
        assertThat(custom.workingDays()).isEqualTo(7);
    }

    @Test
    void allowsSingleDayWindowsAndWindowsWithNoWorkingDays() {
        LocalDate monday = LocalDate.of(2026, 9, 28);
        LocalDate christmas = LocalDate.of(2026, 12, 25);
        assertThat(campaigns.custom(monday, monday).workingDays()).isEqualTo(1);
        assertThat(campaigns.custom(christmas, christmas).workingDays()).isZero();
    }

    @Test
    void rejectsReversedOrMissingCustomDates() {
        LocalDate date = LocalDate.of(2026, 1, 1);
        assertThatThrownBy(() -> campaigns.custom(date, date.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("End date must not be before start date");
        assertThatThrownBy(() -> campaigns.custom(null, date)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> campaigns.custom(date, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1000000000})
    void rejectsInvalidYears(int year) {
        assertThatThrownBy(() -> campaigns.presets(year))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Year must be between 1 and 999999999");
    }
}
