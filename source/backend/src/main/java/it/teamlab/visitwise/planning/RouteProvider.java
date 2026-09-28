package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.util.List;
import java.util.Optional;

/** Real road routing for one day's stops. Implementations must never throw: empty means "use the estimate". */
public interface RouteProvider {

    /** @param stops ordered stops including the base at both ends, at least 2 */
    Optional<RoutedPath> route(List<GeoPoint> stops);
}
