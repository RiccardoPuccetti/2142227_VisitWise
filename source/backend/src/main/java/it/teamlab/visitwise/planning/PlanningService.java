package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.analytics.DeliveryPointResponse;
import it.teamlab.visitwise.common.NotFoundException;
import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.EnterpriseRepository;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.planning.PlanningDtos.CreatePlanRequest;
import it.teamlab.visitwise.planning.PlanningDtos.PlanDay;
import it.teamlab.visitwise.planning.PlanningDtos.PlanKpis;
import it.teamlab.visitwise.planning.PlanningDtos.PlanParameters;
import it.teamlab.visitwise.planning.PlanningDtos.PlanResult;
import it.teamlab.visitwise.planning.PlanningDtos.PlanSummary;
import it.teamlab.visitwise.planning.PlanningDtos.PlannedVisitResponse;
import it.teamlab.visitwise.planning.PlanningDtos.RouteLeg;
import it.teamlab.visitwise.planning.PlanningDtos.RouteRequest;
import it.teamlab.visitwise.planning.PlanningDtos.RouteResponse;
import it.teamlab.visitwise.planning.PlanningDtos.RouteSource;
import it.teamlab.visitwise.planning.PlanningDtos.WhatIfRequest;
import it.teamlab.visitwise.planning.PlanningDtos.WhatIfResult;
import it.teamlab.visitwise.planning.PlanningDtos.WhatIfRow;
import it.teamlab.visitwise.planning.engine.GeoPoint;
import it.teamlab.visitwise.planning.engine.GreedyVisitPlanner;
import it.teamlab.visitwise.planning.engine.PlannedDay;
import it.teamlab.visitwise.planning.engine.PlannerParameters;
import it.teamlab.visitwise.planning.engine.PlannerPoint;
import it.teamlab.visitwise.planning.engine.PlannerResult;
import it.teamlab.visitwise.planning.engine.RoadMatrix;
import it.teamlab.visitwise.planning.engine.Travel;
import it.teamlab.visitwise.planning.engine.TravelModel;
import it.teamlab.visitwise.planning.engine.VisitConstraints;
import it.teamlab.visitwise.planning.engine.VisitPlanner;
import it.teamlab.visitwise.planning.engine.WorkingCalendar;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Integrates the pure MAR-2 engine with imported data and saved scenarios. */
@Service
public class PlanningService {

    private static final int MAX_ROUTE_STOPS = 30;

    private final ImportBatchRepository imports;
    private final EnterpriseRepository enterprises;
    private final DeliveryPointRepository points;
    private final VisitPlanRepository plans;
    private final JsonMapper json;
    private final RouteProvider routes;
    private final RoadMatrixProvider matrices;
    private final VisitPlanner planner = new GreedyVisitPlanner();

    PlanningService(ImportBatchRepository imports, EnterpriseRepository enterprises,
            DeliveryPointRepository points, VisitPlanRepository plans,
            JsonMapper json, RouteProvider routes, RoadMatrixProvider matrices) {
        this.imports = imports;
        this.enterprises = enterprises;
        this.points = points;
        this.plans = plans;
        this.json = json;
        this.routes = routes;
        this.matrices = matrices;
    }

    /**
     * Endpoint 18b: real road route of one day when the provider answers, otherwise the same straight-line estimate
     * used by the planner, so the two never disagree on the fallback. Max 30 stops to respect public OSRM limits.
     */
    public RouteResponse route(RouteRequest request) {
        if (request == null || request.base() == null || request.stops() == null || request.stops().isEmpty()) {
            throw new IllegalArgumentException("A base and at least one stop are required");
        }
        if (request.stops().size() > MAX_ROUTE_STOPS) {
            throw new IllegalArgumentException("A route can have at most " + MAX_ROUTE_STOPS + " stops");
        }
        // Missing (0) or invalid values fall back to the planner defaults.
        TravelModel travel = new TravelModel(
                request.averageSpeedKmh() > 0 ? request.averageSpeedKmh() : TravelModel.DEFAULT.averageSpeedKmh(),
                request.roadFactor() >= 1 ? request.roadFactor() : TravelModel.DEFAULT.roadFactor());
        List<GeoPoint> path = new ArrayList<>(request.stops().size() + 2);
        path.add(toEngine(request.base()));
        request.stops().forEach(stop -> path.add(toEngine(stop)));
        path.add(toEngine(request.base()));
        return routes.route(path)
                .filter(routed -> !routed.geometry().isEmpty())
                .map(routed -> new RouteResponse(RouteSource.OSRM, round1(routed.km()), round1(routed.minutes()),
                        routed.legs().stream().map(leg -> new RouteLeg(round1(leg.km()), round1(leg.minutes())))
                                .toList(), toDto(routed.geometry())))
                .orElseGet(() -> estimate(travel, path));
    }

    private static GeoPoint toEngine(PlanningDtos.GeoPoint point) {
        if (point == null) {
            throw new IllegalArgumentException("Every stop needs coordinates");
        }
        return new GeoPoint(point.latitude(), point.longitude());
    }

    private static List<PlanningDtos.GeoPoint> toDto(List<GeoPoint> points) {
        return points.stream().map(p -> new PlanningDtos.GeoPoint(p.latitude(), p.longitude())).toList();
    }

    private static RouteResponse estimate(TravelModel travel, List<GeoPoint> path) {
        List<RouteLeg> legs = new ArrayList<>();
        double km = 0;
        double minutes = 0;
        for (int i = 1; i < path.size(); i++) {
            double legKm = travel.roadDistanceKm(path.get(i - 1), path.get(i));
            double legMinutes = travel.travelMinutes(path.get(i - 1), path.get(i));
            km += legKm;
            minutes += legMinutes;
            legs.add(new RouteLeg(round1(legKm), round1(legMinutes)));
        }
        return new RouteResponse(RouteSource.ESTIMATE, round1(km), round1(minutes), legs, toDto(path));
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    @Transactional(readOnly = true)
    public PlanResult simulate(Long importId, PlanParameters parameters) {
        return compute(importId, parameters, null, null).response();
    }

    @Transactional(readOnly = true)
    public WhatIfResult whatIf(Long importId, WhatIfRequest request) {
        if (request == null || request.base() == null || request.horizons() == null
                || request.horizons().isEmpty() || request.horizons().size() > 5) {
            throw new IllegalArgumentException("Base parameters and 1 to 5 horizons are required");
        }
        if (request.horizons().stream().anyMatch(value -> value == null || value < 1 || value > 260)) {
            throw new IllegalArgumentException("What-if horizons must be between 1 and 260 working days");
        }
        List<Integer> horizons = request.horizons().stream().distinct().sorted().toList();
        LoadedInput input = load(importId, request.base());
        List<WhatIfRow> rows = new ArrayList<>();
        double previous = 0;
        for (int horizon : horizons) {
            PlanParameters parameters = withWorkingDays(request.base(), horizon);
            PlanKpis kpis = compute(input, parameters, null, null).response().kpis();
            rows.add(new WhatIfRow(horizon, kpis, kpis.coveredRevenue() - previous));
            previous = kpis.coveredRevenue();
        }
        return new WhatIfResult(rows);
    }

    @Transactional
    public PlanSummary save(Long importId, CreatePlanRequest request) {
        if (request == null || request.name() == null || request.name().isBlank()
                || request.name().strip().length() > 150 || request.parameters() == null) {
            throw new IllegalArgumentException("Plan name (1..150 characters) and parameters are required");
        }
        String name = request.name().strip();
        Computed computed = compute(importId, request.parameters(), null, name);
        VisitPlan plan = plans.save(new VisitPlan(computed.importBatch(), name,
                json.writeValueAsString(request.parameters()), json.writeValueAsString(computed.response().kpis())));

        // The plan is managed: its visits are saved with it (cascade).
        Map<Long, DeliveryPoint> byId = computed.pointsById();
        for (PlanDay day : computed.response().days()) {
            for (PlannedVisitResponse visit : day.visits()) {
                plan.addVisit(new PlannedVisit(plan, byId.get(visit.deliveryPointId()), visit.agent(),
                        visit.date(), visit.dayIndex(), visit.slot(), BigDecimal.valueOf(visit.expectedRevenue()),
                        BigDecimal.valueOf(visit.travelKm())));
            }
        }
        return new PlanSummary(plan.getId(), plan.getName(), plan.getCreatedAt(),
                request.parameters(), computed.response().kpis());
    }

    @Transactional(readOnly = true)
    public List<PlanSummary> list(Long importId) {
        return plans.findByImportBatchIdOrderByCreatedAtDesc(importId).stream().map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public PlanResult get(Long planId) {
        VisitPlan plan = plans.findById(planId)
                .orElseThrow(() -> new NotFoundException("Plan", planId));
        PlanParameters parameters = json.readValue(plan.getParameters(), PlanParameters.class);
        return compute(plan.getImportBatch().getId(), parameters, plan.getId(), plan.getName()).response();
    }

    @Transactional
    public void delete(Long planId) {
        VisitPlan plan = plans.findById(planId)
                .orElseThrow(() -> new NotFoundException("Plan", planId));
        plans.delete(plan);
    }

    private PlanSummary summary(VisitPlan plan) {
        return new PlanSummary(plan.getId(), plan.getName(), plan.getCreatedAt(),
                json.readValue(plan.getParameters(), PlanParameters.class),
                json.readValue(plan.getKpis(), PlanKpis.class));
    }

    private Computed compute(Long importId, PlanParameters request, Long planId, String name) {
        if (request == null) {
            throw new IllegalArgumentException("Plan parameters are required");
        }
        return compute(load(importId, request), request, planId, name);
    }

    private LoadedInput load(Long importId, PlanParameters request) {
        var batch = imports.findById(importId)
                .orElseThrow(() -> new NotFoundException("Import", importId));
        validateEnterprises(importId, request);
        var entities = points.findByImportBatchId(importId);
        Map<Long, DeliveryPoint> byId = new HashMap<>();
        List<PlannerPoint> enginePoints = entities.stream().map(point -> {
            byId.put(point.getId(), point);
            Map<Long, Double> revenues = new LinkedHashMap<>();
            point.getRevenues().forEach(revenue -> revenues.put(
                    revenue.getEnterprise().getId(), revenue.getAmount().doubleValue()));
            GeoPoint location = point.getLatitude() == null || point.getLongitude() == null ? null
                    : new GeoPoint(point.getLatitude(), point.getLongitude());
            return new PlannerPoint(point.getId(), point.getCustomerName(), point.getAddress(),
                    point.getCity(), point.getAgent(), location, revenues);
        }).toList();
        return new LoadedInput(batch, enginePoints, byId, roadMatrix(request.base(), enginePoints));
    }

    /**
     * Road figures (US-39) for the base and every located point of the import, not only the eligible ones, so the same
     * table serves every parameter change and what-if horizon. Null when the road network is off or unavailable.
     */
    private RoadMatrix roadMatrix(PlanningDtos.GeoPoint base, List<PlannerPoint> enginePoints) {
        if (base == null) {
            return null;
        }
        Set<GeoPoint> located = new LinkedHashSet<>();
        located.add(new GeoPoint(base.latitude(), base.longitude()));
        enginePoints.stream().sorted(Comparator.comparingLong(PlannerPoint::id))
                .map(PlannerPoint::location).filter(Objects::nonNull).forEach(located::add);
        return located.size() < 2 ? null : matrices.matrix(List.copyOf(located)).orElse(null);
    }

    private Computed compute(LoadedInput input, PlanParameters request, Long planId, String name) {
        var engineParameters = toEngine(request, input.roadMatrix());
        PlannerResult engineResult = planner.plan(input.enginePoints(), engineParameters);
        RouteSource travelSource = input.roadMatrix() == null ? RouteSource.ESTIMATE : RouteSource.OSRM;
        PlanResult response = toResponse(planId, name, request, engineParameters.roads(), travelSource,
                engineResult, input.pointsById());
        return new Computed(input.importBatch(), response, input.pointsById());
    }

    private void validateEnterprises(Long importId, PlanParameters request) {
        if (request.enterpriseWeights() == null) {
            throw new IllegalArgumentException("Enterprise weights are required");
        }
        Set<Long> available = enterprises.findByImportBatchIdOrderByPosition(importId).stream()
                .map(enterprise -> enterprise.getId()).collect(Collectors.toSet());
        Set<Long> seen = new HashSet<>();
        for (var weight : request.enterpriseWeights()) {
            if (weight == null || weight.enterpriseId() == null || !available.contains(weight.enterpriseId())) {
                Long id = weight == null ? null : weight.enterpriseId();
                throw new IllegalArgumentException("Enterprise " + id + " is not part of this import");
            }
            if (!seen.add(weight.enterpriseId())) {
                throw new IllegalArgumentException("Enterprise " + weight.enterpriseId() + " is weighted more than once");
            }
        }
    }

    private static PlannerParameters toEngine(PlanParameters request,
            RoadMatrix roadMatrix) {
        if (request.campaign() == null || request.startDate() == null || request.agents() == null
                || request.planningMode() == null || request.base() == null) {
            throw new IllegalArgumentException("Campaign, start date, agents, planning mode and base are required");
        }
        if (request.agents().stream().anyMatch(agent -> agent == null || agent.isBlank())) {
            throw new IllegalArgumentException("Agent filters cannot be null or blank");
        }
        Map<Long, Double> weights = new LinkedHashMap<>();
        request.enterpriseWeights().forEach(weight -> weights.put(weight.enterpriseId(), weight.weight()));
        LocalDate deadline = request.deadline() == null ? LocalDate.MAX : request.deadline();
        TravelModel travel = new TravelModel(request.averageSpeedKmh(), request.roadFactor());
        return new PlannerParameters(
                request.startDate(), deadline, request.workingDays(), weights, Set.copyOf(request.agents()),
                request.planningMode(), new GeoPoint(request.base().latitude(), request.base().longitude()),
                new VisitConstraints(request.visitDurationMinutes(), request.workdayMinutes(), request.maxDistanceKm()),
                travel, request.travelCostPerKm(), request.minRevenue(),
                roadMatrix == null ? travel : roadMatrix.over(travel));
    }

    private static PlanResult toResponse(Long id, String name, PlanParameters parameters, Travel roads,
            RouteSource travelSource, PlannerResult result, Map<Long, DeliveryPoint> byId) {
        List<PlanDay> days = new ArrayList<>();
        List<LocalDate> workingDates = new WorkingCalendar()
                .workingDates(parameters.startDate(), parameters.workingDays());
        for (PlannedDay day : result.days()) {
            int dayIndex = workingDates.indexOf(day.date());
            List<PlannedVisitResponse> dayVisits = new ArrayList<>();
            GeoPoint previous = new GeoPoint(parameters.base().latitude(), parameters.base().longitude());
            for (int slotIndex = 0; slotIndex < day.targets().size(); slotIndex++) {
                var target = day.targets().get(slotIndex);
                DeliveryPoint point = byId.get(target.id());
                double legKm = roads.roadDistanceKm(previous, target.location());
                dayVisits.add(new PlannedVisitResponse(point.getId(), point.getCustomerName(), point.getPointName(),
                        point.getAddress(), point.getCity(), blankToNull(day.agent()), point.getLatitude(),
                        point.getLongitude(), day.date(), dayIndex, slotIndex + 1, target.revenue(), legKm));
                previous = target.location();
            }
            days.add(new PlanDay(day.date(), blankToNull(day.agent()), dayVisits, day.km()));
        }
        List<DeliveryPointResponse> notPlanned = result.notPlanned().stream()
                .map(target -> DeliveryPointResponse.of(byId.get(target.id()))).toList();
        List<String> warnings = new ArrayList<>();
        if (result.excludedNotGeocoded() > 0) {
            warnings.add(result.excludedNotGeocoded() + " delivery points without coordinates were excluded");
        }
        if (result.kpis().excludedOutOfRange() > 0) {
            warnings.add(result.kpis().excludedOutOfRange() + " delivery points are farther than "
                    + kilometres(parameters.maxDistanceKm()) + " km from the base and were excluded");
        }
        return new PlanResult(id, name, parameters, kpis(result.kpis(), travelSource), days, notPlanned, warnings);
    }

    /** Written like the interface's numbers: Italian decimal comma, at most one decimal ("80", "0,5"). */
    private static String kilometres(double km) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.ITALY);
        format.setMaximumFractionDigits(1);
        return format.format(km);
    }

        private static PlanKpis kpis(PlannerResult.Kpis source, RouteSource travelSource) {
        return new PlanKpis(source.plannedVisits(), source.uniqueCustomers(), source.coveredRevenue(),
                source.eligibleRevenue(), source.coverage(), source.upperBoundRevenue(), source.totalKm(),
                source.travelHours(), source.workingDaysUsed(), source.lastVisitDate(), source.visitsAfterDeadline(),
                source.excludedOutOfRange(), travelSource);
    }

    private static PlanParameters withWorkingDays(PlanParameters base, int days) {
        return new PlanParameters(base.campaign(), base.startDate(), base.deadline(), days, base.enterpriseWeights(),
                base.agents(), base.planningMode(), base.visitDurationMinutes(), base.workdayMinutes(),
                base.averageSpeedKmh(), base.roadFactor(), base.maxDistanceKm(), base.base(),
                base.travelCostPerKm(), base.minRevenue());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record Computed(ImportBatch importBatch, PlanResult response,
                            Map<Long, DeliveryPoint> pointsById) { }

    private record LoadedInput(ImportBatch importBatch, List<PlannerPoint> enginePoints,
                               Map<Long, DeliveryPoint> pointsById, RoadMatrix roadMatrix) { }
}
