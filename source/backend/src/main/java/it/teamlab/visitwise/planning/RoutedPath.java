package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.util.List;

/** A road route through ordered stops: total and per-leg distance/time plus the polyline to draw. */
public record RoutedPath(double km, double minutes, List<Leg> legs, List<GeoPoint> geometry) {

    public record Leg(double km, double minutes) { }
}
