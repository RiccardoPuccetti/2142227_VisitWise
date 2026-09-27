package it.teamlab.visitwise.planning.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Monday-Friday calendar with the Italian and Rome holidays specified by the project. */
public final class WorkingCalendar {

    private static final Set<MonthDay> FIXED_HOLIDAYS = Set.of(
            MonthDay.of(1, 1), MonthDay.of(1, 6), MonthDay.of(4, 25), MonthDay.of(5, 1),
            MonthDay.of(6, 2), MonthDay.of(6, 29), MonthDay.of(8, 15), MonthDay.of(11, 1),
            MonthDay.of(12, 8), MonthDay.of(12, 25), MonthDay.of(12, 26));

    /** Gregorian computus; independent of locale, time zone and the current date. */
    public LocalDate easterSunday(int year) {
        if (year < 1 || year > LocalDate.MAX.getYear()) {
            throw new IllegalArgumentException("Year must be between 1 and 999999999");
        }
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = (h + l - 7 * m + 114) % 31 + 1;
        return LocalDate.of(year, month, day);
    }

    public boolean isWorkingDay(LocalDate date) {
        requireDate(date);
        return date.getDayOfWeek() != DayOfWeek.SATURDAY
                && date.getDayOfWeek() != DayOfWeek.SUNDAY
                && !FIXED_HOLIDAYS.contains(MonthDay.from(date))
                && !date.equals(easterSunday(date.getYear()).plusDays(1));
    }

    /** Returns exactly the requested horizon, starting on or after startDate. */
    public List<LocalDate> workingDates(LocalDate startDate, int workingDays) {
        requireDate(startDate);
        if (workingDays < 1 || workingDays > 260) {
            throw new IllegalArgumentException("Working days must be between 1 and 260");
        }
        List<LocalDate> dates = new ArrayList<>(workingDays);
        LocalDate date = startDate;
        while (dates.size() < workingDays) {
            if (isWorkingDay(date)) {
                dates.add(date);
            }
            if (dates.size() < workingDays) {
                date = date.plusDays(1);
            }
        }
        return List.copyOf(dates);
    }

    /** Both endpoints are included; a window containing only holidays has zero working days. */
    public int countWorkingDays(LocalDate startDate, LocalDate endDate) {
        requireDate(startDate);
        requireDate(endDate);
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must not be before start date");
        }
        int days = 0;
        for (LocalDate date = startDate; ; date = date.plusDays(1)) {
            if (isWorkingDay(date)) {
                days++;
            }
            if (date.equals(endDate)) {
                return days;
            }
        }
    }

    private static void requireDate(LocalDate date) {
        if (date == null || date.getYear() < 1) {
            throw new IllegalArgumentException("Date is required and must have a positive year");
        }
    }
}
