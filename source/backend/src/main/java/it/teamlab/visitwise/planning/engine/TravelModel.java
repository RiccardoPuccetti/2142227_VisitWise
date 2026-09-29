package it.teamlab.visitwise.planning.engine;

/** Local travel estimates: great-circle distance times road factor, at a constant speed. */
public record TravelModel(double averageSpeedKmh, double roadFactor) implements Travel {

    public static final TravelModel DEFAULT = new TravelModel(25, 1.3);
    private static final double EARTH_RADIUS_KM = 6371.0088;

    public TravelModel {
        if (!Double.isFinite(averageSpeedKmh) || averageSpeedKmh <= 0) {
            throw new IllegalArgumentException("Average speed must be finite and greater than zero");
        }
        if (!Double.isFinite(roadFactor) || roadFactor < 1) {
            throw new IllegalArgumentException("Road factor must be finite and at least 1");
        }
    }

    /** Haversine distance on a sphere, scaled to estimate road distance in kilometres. */
    @Override
    public double roadDistanceKm(GeoPoint from, GeoPoint to) {
        requirePoint(from);
        requirePoint(to);
        double fromLatitude = Math.toRadians(from.latitude());
        double toLatitude = Math.toRadians(to.latitude());
        double latitudeSin = Math.sin((toLatitude - fromLatitude) / 2);
        double longitudeSin = Math.sin(Math.toRadians(to.longitude() - from.longitude()) / 2);
        double haversine = latitudeSin * latitudeSin
                + Math.cos(fromLatitude) * Math.cos(toLatitude) * longitudeSin * longitudeSin;
        // Floating-point noise can move an antipodal result slightly outside [0, 1].
        double arc = 2 * Math.asin(Math.sqrt(Math.clamp(haversine, 0, 1)));
        return EARTH_RADIUS_KM * arc * roadFactor;
    }

    /** Fractional minutes are retained for feasibility checks. */
    @Override
    public double travelMinutes(GeoPoint from, GeoPoint to) {
        return roadDistanceKm(from, to) / averageSpeedKmh * 60;
    }

    private static void requirePoint(GeoPoint point) {
        if (point == null) {
            throw new IllegalArgumentException("Location is required");
        }
    }
}
