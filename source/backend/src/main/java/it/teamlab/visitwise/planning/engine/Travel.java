package it.teamlab.visitwise.planning.engine;

/**
 * Road distance and driving time from one point to another: the local estimate ({@link TravelModel}) or times measured
 * on the road network ({@link RoadMatrix}). Directions may differ (one-way streets).
 */
public interface Travel {

    double roadDistanceKm(GeoPoint from, GeoPoint to);

    double travelMinutes(GeoPoint from, GeoPoint to);
}
