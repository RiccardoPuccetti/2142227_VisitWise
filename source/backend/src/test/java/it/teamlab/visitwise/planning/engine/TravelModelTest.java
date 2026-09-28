package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class TravelModelTest {

    private final GeoPoint base = new GeoPoint(0, 0);
    private final TravelModel model = TravelModel.DEFAULT;

    @Test
    void estimatesRoadDistanceAndMinutesUsingConfiguredFactorAndSpeed() {
        GeoPoint point = new GeoPoint(0, 1);
        // One degree on the equator is about 111.195 km before the road factor.
        assertThat(model.roadDistanceKm(base, point)).isCloseTo(144.5536, within(0.001));
        assertThat(model.travelMinutes(base, point)).isCloseTo(346.9287, within(0.001));
        TravelModel configured = new TravelModel(50, 1.5);
        assertThat(configured.roadDistanceKm(base, point)).isCloseTo(166.7926, within(0.001));
        assertThat(configured.travelMinutes(base, point)).isCloseTo(200.1511, within(0.001));
    }

    @Test
    void handlesSameLocationSymmetryDateLineAndAntipodalPoints() {
        GeoPoint other = new GeoPoint(42, 12);
        assertThat(model.roadDistanceKm(base, base)).isZero();
        assertThat(model.travelMinutes(base, base)).isZero();
        assertThat(model.roadDistanceKm(base, other)).isEqualTo(model.roadDistanceKm(other, base));
        assertThat(model.roadDistanceKm(new GeoPoint(0, 179.9), new GeoPoint(0, -179.9)))
                .isCloseTo(28.9107, within(0.001));
        assertThat(model.roadDistanceKm(base, new GeoPoint(0, 180)))
                .isCloseTo(26019.6488, within(0.001));
    }

    @Test
    void sumsEveryLegInTheSuppliedOrderIncludingReturnToBase() {
        GeoPoint first = new GeoPoint(0, 0.1);
        GeoPoint second = new GeoPoint(0.1, 0.1);
        double expectedKm = model.roadDistanceKm(base, first)
                + model.roadDistanceKm(first, second) + model.roadDistanceKm(second, base);
        assertThat(model.roundTripKm(base, List.of(first, second))).isEqualTo(expectedKm);
        assertThat(model.roundTripMinutes(base, List.of(first, second)))
                .isCloseTo(expectedKm / 25 * 60, within(1e-10));
        assertThat(model.roundTripKm(base, List.of(first)))
                .isEqualTo(2 * model.roadDistanceKm(base, first));
    }

    @Test
    void emptyRouteDoesNotTravel() {
        assertThat(model.roundTripKm(base, List.of())).isZero();
        assertThat(model.roundTripMinutes(base, List.of())).isZero();
    }

    @ParameterizedTest
    @ValueSource(doubles = {0, -1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidSpeeds(double speed) {
        assertThatThrownBy(() -> new TravelModel(speed, 1.3))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Average speed must be finite and greater than zero");
    }

    @ParameterizedTest
    @ValueSource(doubles = {0.9, -1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidRoadFactors(double factor) {
        assertThatThrownBy(() -> new TravelModel(25, factor))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Road factor must be finite and at least 1");
    }

    @ParameterizedTest
    @CsvSource({"-90, -180", "90, 180", "0, 0"})
    void acceptsCoordinateBoundaries(double latitude, double longitude) {
        assertThat(new GeoPoint(latitude, longitude).latitude()).isEqualTo(latitude);
    }

    @ParameterizedTest
    @ValueSource(doubles = {-90.1, 90.1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidLatitudes(double latitude) {
        assertThatThrownBy(() -> new GeoPoint(latitude, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Latitude must be finite and between -90 and 90");
    }

    @ParameterizedTest
    @ValueSource(doubles = {-180.1, 180.1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidLongitudes(double longitude) {
        assertThatThrownBy(() -> new GeoPoint(0, longitude))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Longitude must be finite and between -180 and 180");
    }

    @Test
    void rejectsMissingLocationsAndRoutes() {
        assertThatThrownBy(() -> model.roadDistanceKm(null, base)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> model.roadDistanceKm(base, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> model.roundTripKm(null, List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> model.roundTripKm(base, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> model.roundTripKm(base, Arrays.asList(base, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
