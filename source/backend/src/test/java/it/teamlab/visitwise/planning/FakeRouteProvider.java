package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/** Replaces OSRM in tests. {@link #answer(RoutedPath)} sets the next result; {@link #reset()} goes back to empty. */
@Component
@Primary
public class FakeRouteProvider implements RouteProvider {

    private static final AtomicReference<RoutedPath> NEXT = new AtomicReference<>();
    private static final AtomicReference<List<GeoPoint>> LAST_STOPS = new AtomicReference<>();

    public static void answer(RoutedPath path) {
        NEXT.set(path);
    }

    public static List<GeoPoint> lastStops() {
        return LAST_STOPS.get();
    }

    public static void reset() {
        NEXT.set(null);
        LAST_STOPS.set(null);
    }

    @Override
    public Optional<RoutedPath> route(List<GeoPoint> stops) {
        LAST_STOPS.set(stops);
        return Optional.ofNullable(NEXT.get());
    }
}
