package it.teamlab.visitwise.geocoding;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Nominatim settings ({@code visitwise.geocoding.*} in application.yml). The public server requires an identifying
 * User-Agent and at most one request per second: {@code delayMs} is the pause between two provider calls.
 */
@ConfigurationProperties("visitwise.geocoding")
public record GeocodingProperties(String baseUrl, String userAgent, long delayMs, String countryCodes) {

    public GeocodingProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://nominatim.openstreetmap.org";
        }
        if (userAgent == null || userAgent.isBlank()) {
            userAgent = "VisitWise-hackathon/0.1";
        }
        if (delayMs < 0) {
            delayMs = 0;
        }
        if (countryCodes == null) {
            countryCodes = "";
        }
    }
}
