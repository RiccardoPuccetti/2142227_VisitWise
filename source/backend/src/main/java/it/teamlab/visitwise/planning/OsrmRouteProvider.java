package it.teamlab.visitwise.planning;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
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
 * OSRM {@code /route/v1/driving} client (OPTIMIZATION_STRATEGY.md section 9). One request per displayed day, with
 * the full GeoJSON geometry. Any failure (network, non-Ok code, disabled) yields empty so the caller falls back to the
 * straight-line estimate.
 */
@Component
@EnableConfigurationProperties(RoutingProperties.class)
public class OsrmRouteProvider implements RouteProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmRouteProvider.class);

    private final RoutingProperties properties;
    private final RestClient client;

    @Autowired
    public OsrmRouteProvider(RoutingProperties properties) {
        this(properties, RestClient.builder().baseUrl(properties.baseUrl())
                .requestFactory(requestFactory(properties.timeoutMs())).build());
    }

    OsrmRouteProvider(RoutingProperties properties, RestClient client) {
        this.properties = properties;
        this.client = client;
    }

    private static JdkClientHttpRequestFactory requestFactory(long timeoutMs) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return factory;
    }

    @Override
    public Optional<RoutedPath> route(List<GeoPoint> stops) {
        if (!properties.enabled() || stops == null || stops.size() < 2) {
            return Optional.empty();
        }
        String coordinates = stops.stream()
                .map(stop -> String.format(Locale.ROOT, "%.6f,%.6f", stop.longitude(), stop.latitude()))
                .collect(Collectors.joining(";"));
        try {
            Response response = client.get()
                    .uri("/route/v1/driving/" + coordinates + "?overview=full&geometries=geojson&steps=false")
                    .header(HttpHeaders.USER_AGENT, properties.userAgent())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(Response.class);
            return Optional.ofNullable(toPath(response));
        } catch (RuntimeException ex) {
            log.warn("Road routing unavailable, using the estimate: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private static RoutedPath toPath(Response response) {
        if (response == null || !"Ok".equals(response.code()) || response.routes() == null
                || response.routes().isEmpty()) {
            return null;
        }
        Route route = response.routes().get(0);
        List<RoutedPath.Leg> legs = route.legs() == null ? List.of() : route.legs().stream()
                .map(leg -> new RoutedPath.Leg(leg.distance() / 1000.0, leg.duration() / 60.0)).toList();
        List<GeoPoint> geometry = new ArrayList<>();
        if (route.geometry() != null && route.geometry().coordinates() != null) {
            for (double[] lonLat : route.geometry().coordinates()) {
                if (lonLat.length >= 2) {
                    geometry.add(new GeoPoint(lonLat[1], lonLat[0]));
                }
            }
        }
        return new RoutedPath(route.distance() / 1000.0, route.duration() / 60.0, legs, geometry);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Response(String code, List<Route> routes) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Route(double distance, double duration, List<Leg> legs, Geometry geometry) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Leg(double distance, double duration) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Geometry(List<double[]> coordinates) { }
}
