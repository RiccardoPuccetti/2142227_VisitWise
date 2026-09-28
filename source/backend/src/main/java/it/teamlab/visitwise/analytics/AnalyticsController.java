package it.teamlab.visitwise.analytics;

import it.teamlab.visitwise.imports.GeocodeStatus;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read API of an import (API_CONTRACT endpoints 7 and 10). */
@RestController
@RequestMapping("/api/imports/{importId}")
public class AnalyticsController {

    private final AnalyticsService analytics;

    public AnalyticsController(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    /** Endpoint 7: delivery points with coordinates and revenues (US-9, US-11, US-13). */
    @GetMapping("/points")
    public List<DeliveryPointResponse> points(@PathVariable Long importId,
                                              @RequestParam(required = false) GeocodeStatus geocodeStatus) {
        return analytics.points(importId, geocodeStatus);
    }

    /** Endpoint 10: indicators, filtered by comma-separated enterprise ids and agents (US-18). */
    @GetMapping("/analytics/summary")
    public AnalyticsSummary summary(@PathVariable Long importId,
                                    @RequestParam(defaultValue = "") List<Long> enterpriseIds,
                                    @RequestParam(defaultValue = "") List<String> agents) {
        return analytics.summary(importId, enterpriseIds, agents);
    }
}
