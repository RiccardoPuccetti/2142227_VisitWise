package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import it.teamlab.visitwise.planning.engine.RoadMatrix;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Replaces the OSRM table service in tests. {@link #answerEveryPair(double, double)} makes the next tables use the
 * same road distance and time between any two different points; {@link #reset()} goes back to empty (estimate).
 */
@Component
@Primary
public class FakeRoadMatrixProvider implements RoadMatrixProvider {

    private static final AtomicReference<double[]> NEXT = new AtomicReference<>();
    private static final AtomicReference<List<GeoPoint>> LAST_POINTS = new AtomicReference<>();

    public static void answerEveryPair(double km, double minutes) {
        NEXT.set(new double[] {km, minutes});
    }

    public static List<GeoPoint> lastPoints() {
        return LAST_POINTS.get();
    }

    public static void reset() {
        NEXT.set(null);
        LAST_POINTS.set(null);
    }

    @Override
    public Optional<RoadMatrix> matrix(List<GeoPoint> points) {
        LAST_POINTS.set(points);
        double[] pair = NEXT.get();
        if (pair == null) {
            return Optional.empty();
        }
        int size = points.size();
        double[][] km = new double[size][size];
        double[][] minutes = new double[size][size];
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                km[i][j] = i == j ? 0 : pair[0];
                minutes[i][j] = i == j ? 0 : pair[1];
            }
        }
        return Optional.of(new RoadMatrix(points, km, minutes));
    }
}
