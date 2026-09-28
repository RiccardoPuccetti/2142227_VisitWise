package it.teamlab.visitwise.planning.export;

import it.teamlab.visitwise.common.NotFoundException;
import it.teamlab.visitwise.planning.PlannedVisit;
import it.teamlab.visitwise.planning.PlannedVisitRepository;
import it.teamlab.visitwise.planning.PlanningDtos.PlanParameters;
import it.teamlab.visitwise.planning.VisitPlan;
import it.teamlab.visitwise.planning.VisitPlanRepository;
import it.teamlab.visitwise.planning.engine.PlanningMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Builds the Excel file of a saved plan from its stored visits (US-29). */
@Service
public class PlanExportService {

    private final VisitPlanRepository plans;
    private final PlannedVisitRepository visits;
    private final JsonMapper json;

    PlanExportService(VisitPlanRepository plans, PlannedVisitRepository visits, JsonMapper json) {
        this.plans = plans;
        this.visits = visits;
        this.json = json;
    }

    /** The file of the plan, or of one agent of the plan when {@code agent} is not blank. */
    @Transactional(readOnly = true)
    public PlanExport export(Long planId, String agent) {
        VisitPlan plan = plans.findById(planId).orElseThrow(() -> new NotFoundException("Plan", planId));
        boolean oneAgent = agent != null && !agent.isBlank();
        List<ExportVisit> rows = visits.findByPlanIdOrderByAgentAscDayIndexAscSlotAsc(planId).stream()
                .filter(visit -> !oneAgent || agent.equals(visit.getAgent()))
                .map(PlanExportService::row)
                .toList();
        if (oneAgent && rows.isEmpty()) {
            throw new NotFoundException("Agent", agent + " in plan " + planId);
        }
        String fileName = "visitwise-plan-" + planId + (oneAgent ? "-" + slug(agent) : "") + ".xlsx";
        return new PlanExport(fileName, PlanWorkbook.write(rows, noAgentLabel(plan)));
    }

    /** In single-visitor mode no visit has an agent: one person does them all. */
    private String noAgentLabel(VisitPlan plan) {
        PlanParameters parameters = json.readValue(plan.getParameters(), PlanParameters.class);
        return parameters.planningMode() == PlanningMode.SINGLE_VISITOR ? "Single visitor" : "No agent";
    }

    private static ExportVisit row(PlannedVisit visit) {
        var point = visit.getDeliveryPoint();
        return new ExportVisit(visit.getAgent(), visit.getVisitDate(), visit.getSlot(), point.getCustomerName(),
                point.getPointName(), point.getAddress(), point.getCity(), visit.getExpectedRevenue(),
                visit.getTravelKm());
    }

    private static String slug(String value) {
        String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        return slug.isEmpty() ? "agent" : slug;
    }

    /** File name and .xlsx content. */
    public record PlanExport(String fileName, byte[] content) { }
}
