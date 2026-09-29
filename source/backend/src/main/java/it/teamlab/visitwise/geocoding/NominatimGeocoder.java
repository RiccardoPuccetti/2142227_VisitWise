package it.teamlab.visitwise.geocoding;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.function.UnaryOperator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Public Nominatim client (OPTIMIZATION_STRATEGY.md section 9). Usage policy: identifying User-Agent, at most one
 * request per second, so calls are serialized and spaced by {@link GeocodingProperties#delayMs()}. Tries a structured
 * query (street + city) first, then the free-form "address, city": the second form helps with ERP addresses that mix
 * street, number and extra words.
 */
@Component
public class NominatimGeocoder implements Geocoder {

    private static final Logger log = LoggerFactory.getLogger(NominatimGeocoder.class);
    private static final ParameterizedTypeReference<List<Result>> RESULTS = new ParameterizedTypeReference<>() { };

    private final RestClient client;
    private final GeocodingProperties properties;
    private final Object pacing = new Object();
    private long lastRequestAt;

    @Autowired
    public NominatimGeocoder(GeocodingProperties properties) {
        this(properties, RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory())
                .build());
    }

    NominatimGeocoder(GeocodingProperties properties, RestClient client) {
        this.properties = properties;
        this.client = client;
    }

    private static JdkClientHttpRequestFactory requestFactory() {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }

    @Override
    public Optional<GeocodedLocation> geocode(String address, String city) {
        Optional<GeocodedLocation> structured = query(uri -> uri
                .queryParam("street", address)
                .queryParam("city", city));
        if (structured.isPresent()) {
            return structured;
        }
        return query(uri -> uri.queryParam("q", address + ", " + city));
    }

    @Override
    public String name() {
        return "nominatim";
    }

    private Optional<GeocodedLocation> query(UnaryOperator<
            org.springframework.web.util.UriBuilder> params) {
        pace();
        List<Result> results;
        try {
            results = client.get()
                    .uri(uri -> {
                        uri.path("/search").queryParam("format", "jsonv2").queryParam("limit", 1);
                        if (!properties.countryCodes().isBlank()) {
                            uri.queryParam("countrycodes", properties.countryCodes());
                        }
                        return params.apply(uri).build();
                    })
                    .header(HttpHeaders.USER_AGENT, properties.userAgent())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(RESULTS);
        } catch (RestClientException ex) {
            log.warn("Geocoder unavailable: {}", ex.getMessage());
            throw new GeocoderUnavailableException("Geocoding service unavailable", ex);
        }
        if (results == null || results.isEmpty()) {
            return Optional.empty();
        }
        try {
            return Optional.of(new GeocodedLocation(
                    Double.parseDouble(results.get(0).lat()), Double.parseDouble(results.get(0).lon())));
        } catch (RuntimeException ex) {
            log.warn("Geocoder answered with unreadable coordinates: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /** Waits so that two provider calls are at least {@code delayMs} apart, whatever thread makes them. */
    private void pace() {
        synchronized (pacing) {
            long wait = lastRequestAt + properties.delayMs() - System.currentTimeMillis();
            if (wait > 0) {
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new GeocoderUnavailableException("Geocoding interrupted", ex);
                }
            }
            lastRequestAt = System.currentTimeMillis();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Result(String lat, String lon) { }
}
