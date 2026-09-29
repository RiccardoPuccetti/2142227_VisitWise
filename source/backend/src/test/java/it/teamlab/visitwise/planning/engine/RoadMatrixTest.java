package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class RoadMatrixTest {
    private final GeoPoint a = new GeoPoint(41.90, 12.48);
    private final GeoPoint b = new GeoPoint(41.91, 12.50);
    private final GeoPoint unknown = new GeoPoint(41.95, 12.55);

    private RoadMatrix matrix(double[][] km, double[][] minutes) {
        return new RoadMatrix(List.of(a, b), km, minutes);
    }

    @Test
    void usesTheMeasuredDistanceAndTimeOfEachDirection() {
        var roads = matrix(new double[][] {{0, 2.5}, {3.0, 0}}, new double[][] {{0, 4}, {5, 0}})
                .over(TravelModel.DEFAULT);
        assertThat(roads.roadDistanceKm(a, b)).isEqualTo(2.5);
        assertThat(roads.roadDistanceKm(b, a)).isEqualTo(3.0);
        assertThat(roads.travelMinutes(a, b)).isEqualTo(4);
        assertThat(roads.travelMinutes(b, a)).isEqualTo(5);
    }

    @Test
    void estimatesPairsWithAnUnknownPointOrWithoutARoad() {
        var slow = new TravelModel(10, 2);
        var roads = matrix(new double[][] {{0, Double.NaN}, {3.0, 0}}, new double[][] {{0, Double.NaN}, {5, 0}})
                .over(slow);
        assertThat(roads.roadDistanceKm(a, unknown)).isEqualTo(slow.roadDistanceKm(a, unknown));
        assertThat(roads.travelMinutes(unknown, b)).isEqualTo(slow.travelMinutes(unknown, b));
        assertThat(roads.roadDistanceKm(a, b)).isEqualTo(slow.roadDistanceKm(a, b));
        assertThat(roads.travelMinutes(a, b)).isEqualTo(slow.travelMinutes(a, b));
    }

    @Test
    void keepsItsOwnCopyOfTheInput() {
        double[][] km = {{0, 2.5}, {3.0, 0}};
        var matrix = matrix(km, new double[][] {{0, 4}, {5, 0}});
        km[0][1] = 99;
        assertThat(matrix.over(TravelModel.DEFAULT).roadDistanceKm(a, b)).isEqualTo(2.5);
    }

    @Test
    void rejectsTablesThatDoNotMatchThePoints() {
        double[][] square = {{0, 1}, {1, 0}};
        assertThatThrownBy(() -> matrix(new double[][] {{0, 1}}, square))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> matrix(square, new double[][] {{0, 1}, {1}}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> matrix(new double[][] {{0, -1}, {1, 0}}, square))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> matrix(square, new double[][] {{0, Double.POSITIVE_INFINITY}, {1, 0}}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RoadMatrix(List.of(a, a), square, square))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> matrix(square, square).over(null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
