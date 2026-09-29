package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** What the OSRM route and table clients share: the HTTP client, the coordinates in the path and the GET request. */
final class OsrmRequests {

    private OsrmRequests() {
    }

    static RestClient client(RoutingProperties routing) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofMillis(routing.timeoutMs()));
        return RestClient.builder().baseUrl(routing.baseUrl()).requestFactory(factory).build();
    }

    /** "lon,lat;lon,lat" with 6 decimals (about 10 cm), the order OSRM expects. */
    static String coordinates(List<GeoPoint> points) {
        return points.stream()
                .map(point -> String.format(Locale.ROOT, "%.6f,%.6f", point.longitude(), point.latitude()))
                .collect(Collectors.joining(";"));
    }

    static <T> T get(RestClient client, String uri, String userAgent, Class<T> type) {
        return client.get()
                .uri(uri)
                .header(HttpHeaders.USER_AGENT, userAgent)
                // osrm-routed answers "deflate" in a form the JDK client cannot read (ZipException): gzip only.
                .header(HttpHeaders.ACCEPT_ENCODING, "gzip")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(type);
    }
}
