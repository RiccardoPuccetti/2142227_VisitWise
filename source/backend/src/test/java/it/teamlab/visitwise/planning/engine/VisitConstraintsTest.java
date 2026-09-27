package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class VisitConstraintsTest {

    private final GeoPoint base = new GeoPoint(0, 0);
    private final TravelModel travel = TravelModel.DEFAULT;
    private final VisitConstraints constraints = VisitConstraints.DEFAULT;

    @Test
    void usesTheDocumentedDefaults() {
        assertThat(constraints.visitDurationMinutes()).isEqualTo(210);
        assertThat(constraints.workdayMinutes()).isEqualTo(480);
        assertThat(constraints.maxDistanceKm()).isEqualTo(80);
        assertThat(travel.averageSpeedKmh()).isEqualTo(25);
        assertThat(travel.roadFactor()).isEqualTo(1.3);
    }

    @Test
    void appliesMaximumDistanceToOneWayEstimatedRoadDistance() {
        // About 66.7 km straight-line, but 86.7 km by the configured road estimate.
        assertThat(constraints.isWithinRange(base, new GeoPoint(0, 0.6), travel)).isFalse();
        assertThat(constraints.isWithinRange(base, new GeoPoint(0, 0.5), travel)).isTrue();
        GeoPoint point = new GeoPoint(0, 0.1);
        double distance = travel.roadDistanceKm(base, point);
        assertThat(new VisitConstraints(210, 480, distance).isWithinRange(base, point, travel)).isTrue();
        assertThat(new VisitConstraints(210, 480, Math.nextDown(distance))
                .isWithinRange(base, point, travel)).isFalse();
        assertThat(new VisitConstraints(210, 480, 0).isWithinRange(base, base, travel)).isTrue();
    }

    @Test
    void includesVisitsAllTravelAndReturnInDayFeasibility() {
        GeoPoint near = new GeoPoint(0, 0.01);
        GeoPoint farther = new GeoPoint(0, 0.1);
        assertThat(constraints.fitsDay(base, List.of(near, near), travel)).isTrue();
        // The outbound leg alone fits the remaining hour; the round trip does not.
        assertThat(constraints.fitsDay(base, List.of(farther, farther), travel)).isFalse();
        assertThat(constraints.fitsDay(base, List.of(base, base, base), travel)).isFalse();
        assertThat(constraints.fitsDay(base, List.of(), travel)).isTrue();
    }

    @Test
    void honorsTheSuppliedBaseAndExcludesEveryOutOfRangeStop() {
        GeoPoint otherBase = new GeoPoint(0, 1);
        GeoPoint point = new GeoPoint(0, 1.01);
        assertThat(constraints.fitsDay(otherBase, List.of(point), travel)).isTrue();
        assertThat(constraints.fitsDay(base, List.of(point), travel)).isFalse();
        VisitConstraints longDay = new VisitConstraints(30, 1440, 80);
        assertThat(longDay.fitsDay(base, List.of(base, new GeoPoint(0, 0.6)), travel)).isFalse();
    }

    @Test
    void acceptsExactWorkdayLimitAndDoesNotRoundAwayExtraTravel() {
        VisitConstraints fullDay = new VisitConstraints(240, 480, 80);
        assertThat(fullDay.fitsDay(base, List.of(base, base), travel)).isTrue();
        assertThat(fullDay.fitsDay(base, List.of(base, new GeoPoint(0, 0.000001)), travel)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(ints = {30, 480})
    void acceptsVisitDurationLimits(int minutes) {
        assertThat(new VisitConstraints(minutes, minutes, 80).fitsDay(base, List.of(base), travel)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 29, 481})
    void rejectsInvalidVisitDurations(int minutes) {
        assertThatThrownBy(() -> new VisitConstraints(minutes, 480, 80))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Visit duration must be between 30 and 480 minutes");
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 209})
    void rejectsWorkdaysShorterThanAVisit(int minutes) {
        assertThatThrownBy(() -> new VisitConstraints(210, minutes, 80))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Workday must be at least as long as a visit");
    }

    @ParameterizedTest
    @ValueSource(doubles = {-1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidMaximumDistances(double distance) {
        assertThatThrownBy(() -> new VisitConstraints(210, 480, distance))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Maximum distance must be finite and non-negative");
    }

    @Test
    void rejectsMissingFeasibilityInputsEvenForAnEmptyDay() {
        assertThatThrownBy(() -> constraints.fitsDay(null, List.of(), travel))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> constraints.fitsDay(base, null, travel))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> constraints.fitsDay(base, List.of(), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> constraints.isWithinRange(base, base, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
