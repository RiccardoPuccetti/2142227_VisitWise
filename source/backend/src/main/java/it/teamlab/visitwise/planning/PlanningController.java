package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.planning.PlanningDtos.CreatePlanRequest;
import it.teamlab.visitwise.planning.PlanningDtos.PlanParameters;
import it.teamlab.visitwise.planning.PlanningDtos.PlanResult;
import it.teamlab.visitwise.planning.PlanningDtos.PlanSummary;
import it.teamlab.visitwise.planning.PlanningDtos.RouteRequest;
import it.teamlab.visitwise.planning.PlanningDtos.RouteResponse;
import it.teamlab.visitwise.planning.PlanningDtos.WhatIfRequest;
import it.teamlab.visitwise.planning.PlanningDtos.WhatIfResult;
import it.teamlab.visitwise.planning.engine.CampaignWindow;
import it.teamlab.visitwise.planning.engine.CampaignWindows;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Planning API (MAR-3): campaign windows, simulations, what-if analysis and saved scenarios. */
@RestController
@RequestMapping("/api")
public class PlanningController {

    private final PlanningService planning;

    PlanningController(PlanningService planning) {
        this.planning = planning;
    }

    @GetMapping("/planning/campaigns")
    List<CampaignWindow> campaigns(@RequestParam int year) {
        if (year < 1583 || year > 9999) {
            throw new IllegalArgumentException("Year must be between 1583 and 9999");
        }
        return new CampaignWindows().presets(year);
    }

    @PostMapping("/imports/{importId}/plans/simulate")
    PlanResult simulate(@PathVariable Long importId, @RequestBody PlanParameters parameters) {
        return planning.simulate(importId, parameters);
    }

    @PostMapping("/imports/{importId}/plans/what-if")
    WhatIfResult whatIf(@PathVariable Long importId, @RequestBody WhatIfRequest request) {
        return planning.whatIf(importId, request);
    }

    /** Endpoint 18 (US-24): road route of one planned day, real (OSRM) when available, estimated otherwise. */
    @PostMapping("/imports/{importId}/plans/route")
    RouteResponse route(@PathVariable Long importId, @RequestBody RouteRequest request) {
        return planning.route(request);
    }

    @PostMapping("/imports/{importId}/plans")
    ResponseEntity<PlanSummary> save(@PathVariable Long importId, @RequestBody CreatePlanRequest request) {
        PlanSummary saved = planning.save(importId, request);
        return ResponseEntity.created(URI.create("/api/plans/" + saved.id())).body(saved);
    }

    @GetMapping("/imports/{importId}/plans")
    List<PlanSummary> list(@PathVariable Long importId) {
        return planning.list(importId);
    }

    @GetMapping("/plans/{planId}")
    PlanResult get(@PathVariable Long planId) {
        return planning.get(planId);
    }

    @DeleteMapping("/plans/{planId}")
    ResponseEntity<Void> delete(@PathVariable Long planId) {
        planning.delete(planId);
        return ResponseEntity.noContent().build();
    }
}
