package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class WorkingCalendarTest {

    private final WorkingCalendar calendar = new WorkingCalendar();

    @ParameterizedTest
    @CsvSource({"2026, 2026-04-05", "2027, 2027-03-28", "2000, 2000-04-23",
            "1900, 1900-04-15", "1818, 1818-03-22", "1943, 1943-04-25"})
    void computesGregorianEasterIncludingCenturyAndExtremeDates(int year, LocalDate easter) {
        assertThat(calendar.easterSunday(year)).isEqualTo(easter);
        assertThat(calendar.isWorkingDay(easter.plusDays(1))).isFalse();
    }

    @Test
    void excludesEveryFixedHolidayInTheProjectCalendarIncludingRomePatronSaints() {
        List<MonthDay> holidays = List.of(MonthDay.of(1, 1), MonthDay.of(1, 6),
                MonthDay.of(4, 25), MonthDay.of(5, 1), MonthDay.of(6, 2), MonthDay.of(6, 29),
                MonthDay.of(8, 15), MonthDay.of(11, 1), MonthDay.of(12, 8),
                MonthDay.of(12, 25), MonthDay.of(12, 26));

        // Several years ensure no fixed holiday passes only because it falls on a weekend.
        for (int year = 2026; year <= 2032; year++) {
            for (MonthDay holiday : holidays) {
                assertThat(calendar.isWorkingDay(holiday.atYear(year)))
                        .as("holiday %s in %s", holiday, year).isFalse();
            }
        }
    }

    @Test
    void acceptsWeekdaysAndExcludesWeekends() {
        LocalDate monday = LocalDate.of(2026, 9, 21);
        for (int day = 0; day < 7; day++) {
            assertThat(calendar.isWorkingDay(monday.plusDays(day))).isEqualTo(day < 5);
        }
    }

    @Test
    void includesStartDateAndSkipsEasterWeekendAndMonday() {
        assertThat(calendar.workingDates(LocalDate.of(2026, 4, 3), 3))
                .containsExactly(LocalDate.of(2026, 4, 3), LocalDate.of(2026, 4, 7),
                        LocalDate.of(2026, 4, 8));
    }

    @Test
    void advancesFromNonWorkingStartAcrossYearBoundary() {
        assertThat(calendar.workingDates(LocalDate.of(2026, 12, 25), 8))
                .containsExactly(LocalDate.of(2026, 12, 28), LocalDate.of(2026, 12, 29),
                        LocalDate.of(2026, 12, 30), LocalDate.of(2026, 12, 31),
                        LocalDate.of(2027, 1, 4), LocalDate.of(2027, 1, 5),
                        LocalDate.of(2027, 1, 7), LocalDate.of(2027, 1, 8));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 260})
    void acceptsBothHorizonLimits(int days) {
        List<LocalDate> dates = calendar.workingDates(LocalDate.of(2026, 1, 1), days);
        assertThat(dates).hasSize(days).doesNotHaveDuplicates().isSorted();
        assertThat(dates).allMatch(calendar::isWorkingDay);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 261})
    void rejectsInvalidHorizons(int days) {
        assertThatThrownBy(() -> calendar.workingDates(LocalDate.of(2026, 1, 1), days))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Working days must be between 1 and 260");
    }

    @Test
    void countsWorkingDatesInclusivelyIncludingEmptyHolidayWindows() {
        assertThat(calendar.countWorkingDays(LocalDate.of(2026, 9, 21), LocalDate.of(2026, 9, 21)))
                .isEqualTo(1);
        assertThat(calendar.countWorkingDays(LocalDate.of(2026, 4, 4), LocalDate.of(2026, 4, 6)))
                .isZero();
        assertThat(calendar.countWorkingDays(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 19)))
                .isEqualTo(34);
    }

    @Test
    void rejectsMissingDatesAndReversedWindows() {
        LocalDate date = LocalDate.of(2026, 1, 1);
        assertThatThrownBy(() -> calendar.isWorkingDay(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calendar.workingDates(null, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calendar.countWorkingDays(null, date)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calendar.countWorkingDays(date, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calendar.countWorkingDays(date, date.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("End date must not be before start date");
    }
}
