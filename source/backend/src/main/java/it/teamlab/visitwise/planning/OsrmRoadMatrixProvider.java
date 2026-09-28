package it.teamlab.visitwise.planning;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import it.teamlab.visitwise.planning.engine.GeoPoint;
import it.teamlab.visitwise.planning.engine.RoadMatrix;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * OSRM {@code /table/v1/driving} client (US-39): road distances and driving times between every pair of points, asked
 * in blocks of at most {@code blockSize} sources by {@code blockSize} destinations and kept in a small in-memory cache.
 * A point that OSRM places more than {@link #MAX_SNAP_METRES} away (outside the downloaded map) and a pair without a
 * road are left to the estimate. Any failure yields empty, so the planner uses the estimate for everything.
 */
@Component
@EnableConfigurationProperties({RoutingProperties.class, RoadMatrixProperties.class})
public class OsrmRoadMatrixProvider implements RoadMatrixProvider {

    /** OSRM moves every point to the nearest road it knows, even thousands of km away. */
    static final double MAX_SNAP_METRES = 1000;

    private static final Logger log = LoggerFactory.getLogger(OsrmRoadMatrixProvider.class);

    private final RoutingProperties routing;
    private final RoadMatrixProperties properties;
    private final RestClient client;
    private final Map<List<GeoPoint>, RoadMatrix> cache;

    @Autowired
    public OsrmRoadMatrixProvider(RoutingProperties routing, RoadMatrixProperties properties) {
        this(routing, properties, RestClient.builder().baseUrl(routing.baseUrl())
                .requestFactory(requestFactory(routing.timeoutMs())).build());
    }

    OsrmRoadMatrixProvider(RoutingProperties routing, RoadMatrixProperties properties, RestClient client) {
        this.routing = routing;
        this.properties = properties;
        this.client = client;
        this.cache = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<List<GeoPoint>, RoadMatrix> eldest) {
                return size() > properties.cacheSize();
            }
        };
    }

    private static JdkClientHttpRequestFactory requestFactory(long timeoutMs) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return factory;
    }

    @Override
    public Optional<RoadMatrix> matrix(List<GeoPoint> points) {
        if (!routing.enabled() || !properties.enabled() || points == null || points.size() < 2) {
            return Optional.empty();
        }
        List<GeoPoint> key = List.copyOf(points);
        synchronized (cache) {
            RoadMatrix cached = cache.get(key);
            if (cached != null) {
                return Optional.of(cached);
            }
        }
        try {
            RoadMatrix matrix = fetch(key);
            synchronized (cache) {
                cache.put(key, matrix);
            }
            return Optional.of(matrix);
        } catch (RuntimeException ex) {
            log.warn("Road distance matrix unavailable, using the estimate: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private RoadMatrix fetch(List<GeoPoint> points) {
        int size = points.size();
        int block = properties.blockSize();
        double[][] km = new double[size][size];
        double[][] minutes = new double[size][size];
        boolean[] offMap = new boolean[size];
        for (int from = 0; from < size; from += block) {
            for (int to = 0; to < size; to += block) {
                int fromEnd = Math.min(from + block, size);
                int toEnd = Math.min(to + block, size);
                if (from == to && fromEnd - from == 1) {
                    continue; // OSRM needs two coordinates; a point to itself is 0 anyway.
                }
                Table table = request(points, from, fromEnd, to, toEnd);
                markOffMap(table.sources(), from, offMap);
                markOffMap(table.destinations(), to, offMap);
                for (int i = from; i < fromEnd; i++) {
                    for (int j = to; j < toEnd; j++) {
                        km[i][j] = value(table.distances(), i - from, j - to) / 1000;
                        minutes[i][j] = value(table.durations(), i - from, j - to) / 60;
                    }
                }
            }
        }
        for (int i = 0; i < size; i++) {
            if (offMap[i]) {
                for (int j = 0; j < size; j++) {
                    km[i][j] = km[j][i] = minutes[i][j] = minutes[j][i] = Double.NaN;
                }
            }
        }
        return new RoadMatrix(points, km, minutes);
    }

    /** One block: the whole table of a diagonal block, otherwise sources then destinations. */
    private Table request(List<GeoPoint> points, int from, int fromEnd, int to, int toEnd) {
        boolean diagonal = from == to;
        List<GeoPoint> coordinates = diagonal ? points.subList(from, fromEnd)
                : Stream.concat(points.subList(from, fromEnd).stream(),
                        points.subList(to, toEnd).stream()).toList();
        StringBuilder uri = new StringBuilder("/table/v1/driving/")
                .append(coordinates.stream()
                        .map(point -> String.format(Locale.ROOT, "%.6f,%.6f", point.longitude(), point.latitude()))
                        .collect(Collectors.joining(";")))
                .append("?annotations=duration,distance");
        if (!diagonal) {
            int sources = fromEnd - from;
            uri.append("&sources=").append(indices(0, sources))
                    .append("&destinations=").append(indices(sources, sources + toEnd - to));
        }
        Table table = client.get()
                .uri(uri.toString())
                .header(HttpHeaders.USER_AGENT, routing.userAgent())
                // osrm-routed answers "deflate" in a form the JDK client cannot read (ZipException): gzip only.
                .header(HttpHeaders.ACCEPT_ENCODING, "gzip")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(Table.class);
        if (table == null || !"Ok".equals(table.code()) || table.durations() == null || table.distances() == null) {
            throw new IllegalStateException("OSRM table answered " + (table == null ? "nothing" : table.code()));
        }
        return table;
    }

    private static String indices(int start, int end) {
        return IntStream.range(start, end).mapToObj(Integer::toString).collect(Collectors.joining(";"));
    }

    private static void markOffMap(List<Waypoint> waypoints, int offset, boolean[] offMap) {
        if (waypoints == null) {
            return;
        }
        for (int k = 0; k < waypoints.size(); k++) {
            if (waypoints.get(k) == null || waypoints.get(k).distance() > MAX_SNAP_METRES) {
                offMap[offset + k] = true;
            }
        }
    }

    /** Null (no road between the two points) becomes NaN. */
    private static double value(List<List<Double>> rows, int row, int column) {
        Double value = rows.get(row).get(column);
        return value == null ? Double.NaN : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Table(String code, List<List<Double>> durations, List<List<Double>> distances, List<Waypoint> sources,
                 List<Waypoint> destinations) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Waypoint(double distance) { }
}
