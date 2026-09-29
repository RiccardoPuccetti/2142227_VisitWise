package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    void aDayHoldsItsVisitsAndAllItsTravel() {
        // Two default visits take 420 of the 480 minutes: 60 minutes are left for the whole round trip.
        assertThat(constraints.fitsWorkday(60, 2)).isTrue();
        assertThat(constraints.fitsWorkday(60.1, 2)).isFalse();
        assertThat(constraints.fitsWorkday(0, 3)).isFalse();
        assertThat(constraints.fitsWorkday(0, 0)).isTrue();
    }

    @Test
    void acceptsExactWorkdayLimitAndDoesNotRoundAwayExtraTravel() {
        VisitConstraints fullDay = new VisitConstraints(240, 480, 80);
        assertThat(fullDay.fitsWorkday(0, 2)).isTrue();
        assertThat(fullDay.fitsWorkday(0.0001, 2)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(ints = {30, 480})
    void acceptsVisitDurationLimits(int minutes) {
        assertThat(new VisitConstraints(minutes, minutes, 80).fitsWorkday(0, 1)).isTrue();
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
    void rejectsAMissingTravelModel() {
        assertThatThrownBy(() -> constraints.isWithinRange(base, base, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
