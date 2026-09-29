package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import it.teamlab.visitwise.planning.engine.RoadMatrix;
import java.util.List;
import java.util.Optional;

/**
 * Road distances and driving times between every pair of points, for the planner (US-39). Implementations must never
 * throw: empty means "use the straight-line estimate".
 */
public interface RoadMatrixProvider {

    /** @param points distinct points, at least 2 */
    Optional<RoadMatrix> matrix(List<GeoPoint> points);
}
