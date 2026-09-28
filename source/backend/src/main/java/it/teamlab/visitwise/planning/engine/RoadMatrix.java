package it.teamlab.visitwise.planning.engine;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Road distances (km) and driving times (minutes) measured on the road network between known points, row = from,
 * column = to. NaN marks a pair without a road. Immutable: {@link #over(TravelModel)} shares the tables.
 */
public final class RoadMatrix {

    private final Map<GeoPoint, Integer> indices = new HashMap<>();
    private final double[][] km;
    private final double[][] minutes;

    public RoadMatrix(List<GeoPoint> points, double[][] km, double[][] minutes) {
        if (points == null || points.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Points are required");
        }
        for (int i = 0; i < points.size(); i++) {
            if (indices.put(points.get(i), i) != null) {
                throw new IllegalArgumentException("Duplicate point: " + points.get(i));
            }
        }
        this.km = copy(km, points.size());
        this.minutes = copy(minutes, points.size());
    }

    public int size() {
        return km.length;
    }

    /** Measured figures where known; the estimate for pairs with an unknown point or without a road. */
    public Travel over(TravelModel fallback) {
        if (fallback == null) {
            throw new IllegalArgumentException("Fallback travel model is required");
        }
        return new Travel() {
            @Override
            public double roadDistanceKm(GeoPoint from, GeoPoint to) {
                double value = lookup(km, from, to);
                return Double.isNaN(value) ? fallback.roadDistanceKm(from, to) : value;
            }

            @Override
            public double travelMinutes(GeoPoint from, GeoPoint to) {
                double value = lookup(minutes, from, to);
                return Double.isNaN(value) ? fallback.travelMinutes(from, to) : value;
            }
        };
    }

    private double lookup(double[][] table, GeoPoint from, GeoPoint to) {
        Integer row = indices.get(from);
        Integer column = indices.get(to);
        return row == null || column == null ? Double.NaN : table[row][column];
    }

    private static double[][] copy(double[][] table, int size) {
        if (table == null || table.length != size) {
            throw new IllegalArgumentException("Tables must have one row per point");
        }
        double[][] copy = new double[size][];
        for (int i = 0; i < size; i++) {
            if (table[i] == null || table[i].length != size) {
                throw new IllegalArgumentException("Tables must have one column per point");
            }
            for (double value : table[i]) {
                if (value < 0 || Double.isInfinite(value)) {
                    throw new IllegalArgumentException("Distances and times must be finite and non-negative");
                }
            }
            copy[i] = table[i].clone();
        }
        return copy;
    }
}
