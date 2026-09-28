package it.teamlab.visitwise.planning;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Road routing settings ({@code visitwise.routing.*}). The public OSRM demo server has no SLA and forbids large
 * matrices: it is used only to draw and measure the route of one day (a handful of stops), never for selection.
 */
@ConfigurationProperties("visitwise.routing")
public record RoutingProperties(boolean enabled, String baseUrl, String userAgent, long timeoutMs) {

    public RoutingProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://router.project-osrm.org";
        }
        if (userAgent == null || userAgent.isBlank()) {
            userAgent = "VisitWise-hackathon/0.1";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 8000;
        }
    }
}
