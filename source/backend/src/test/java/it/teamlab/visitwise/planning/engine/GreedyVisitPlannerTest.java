package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.junit.jupiter.api.Assertions.assertTimeout;

import java.time.LocalDate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class GreedyVisitPlannerTest {
    private final VisitPlanner planner = new GreedyVisitPlanner();
    private final GeoPoint base = new GeoPoint(0, 0);

    private PlannerParameters parameters(PlanningMode mode, int days) {
        return new PlannerParameters(LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 7), days,
                Map.of(1L, 1.0), Set.of(), mode, base, VisitConstraints.DEFAULT, TravelModel.DEFAULT, 2, 0);
    }

    private PlannerPoint point(long id, String address, String agent, double revenue) {
        return new PlannerPoint(id, "Customer " + id, "Point " + id, address, "Rome", agent,
                base, Map.of(1L, revenue));
    }

    @Test
    void groupsAddressesWithinAnAgentAndRetainsEverySourcePoint() {
        var result = planner.plan(List.of(point(2, " VIA  UNO ", "A", 200),
                point(1, "via uno", "A", 100)), parameters(PlanningMode.PER_AGENT, 1));
        assertThat(result.kpis().plannedVisits()).isEqualTo(1);
        assertThat(result.kpis().uniqueCustomers()).isEqualTo(2);
        assertThat(result.kpis().coveredRevenue()).isEqualTo(300);
        assertThat(result.days().getFirst().targets().getFirst().points())
                .extracting(PlannerPoint::id).containsExactly(1L, 2L);
    }

    @Test
    void parallelAgentsHaveSeparateCapacityAndSingleVisitorSharesIt() {
        var points = List.of(point(1, "One", "A", 100), point(2, "Two", "A", 90),
                point(3, "Three", "B", 80), point(4, "Four", "B", 70));
        var parallel = planner.plan(points, parameters(PlanningMode.PER_AGENT, 1));
        assertThat(parallel.kpis().plannedVisits()).isEqualTo(4);
        assertThat(parallel.kpis().workingDaysUsed()).isEqualTo(1);
        var single = planner.plan(points, parameters(PlanningMode.SINGLE_VISITOR, 1));
        assertThat(single.kpis().plannedVisits()).isEqualTo(2);
        assertThat(single.notPlanned()).extracting(VisitTarget::id).containsExactly(3L, 4L);
    }

    @Test
    void usesWorkingDatesAndFlagsVisitsAfterDeadline() {
        var result = planner.plan(List.of(point(1, "One", "A", 100), point(2, "Two", "A", 90),
                point(3, "Three", "A", 80), point(4, "Four", "A", 70),
                point(5, "Five", "A", 60)), parameters(PlanningMode.PER_AGENT, 3));
        assertThat(result.days()).extracting(PlannedDay::date).containsExactly(
                LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 7), LocalDate.of(2026, 12, 9));
        assertThat(result.kpis().visitsAfterDeadline()).isEqualTo(1);
        assertThat(result.kpis().lastVisitDate()).isEqualTo(LocalDate.of(2026, 12, 9));
    }

    @Test
    void inputOrderDoesNotChangeTiesOrTheResult() {
        var a = point(1, "One", "B", 100);
        var b = point(2, "Two", "A", 100);
        var c = point(3, "Three", "A", 100);
        assertThat(planner.plan(List.of(a, b, c), parameters(PlanningMode.SINGLE_VISITOR, 1)))
                .isEqualTo(planner.plan(List.of(c, b, a), parameters(PlanningMode.SINGLE_VISITOR, 1)));
    }

    private PlannerParameters custom(int duration, int minutes, int days, double penalty,
                                     double minimum, Map<Long, Double> weights, Set<String> agents) {
        return new PlannerParameters(LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 7), days,
                weights, agents, PlanningMode.SINGLE_VISITOR, base,
                new VisitConstraints(duration, minutes, 80), TravelModel.DEFAULT, penalty, minimum);
    }

    private PlannerPoint located(long id, double longitude, double revenue) {
        return new PlannerPoint(id, "Customer " + id, "Point " + id, "Address " + id, "Rome", "A",
                new GeoPoint(0, longitude), Map.of(1L, revenue));
    }

    @Test
    void fillsBeyondThreeStopsUntilTheTimeBudgetIsFull() {
        var points = new ArrayList<PlannerPoint>();
        for (int i = 1; i <= 20; i++) points.add(point(i, "Address " + i, "A", 100));
        var result = planner.plan(points, custom(30, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of()));
        assertThat(result.kpis().plannedVisits()).isEqualTo(16);
        assertThat(result.kpis().upperBoundRevenue()).isEqualTo(1600);
        assertThat(result.notPlanned()).hasSize(4);
    }

    @Test
    void weightsSelectTargetsButKpisUseOnlyPositiveUnweightedSelectedRevenue() {
        var a = new PlannerPoint(1, "C1", "P1", "One", "Rome", "A", base,
                Map.of(1L, 100.0, 2L, -50.0, 3L, 10000.0));
        var b = new PlannerPoint(2, "C2", "P2", "Two", "Rome", "A", base,
                Map.of(1L, 0.0, 2L, 60.0));
        var result = planner.plan(List.of(a, b), custom(480, 480, 1, 0, 0,
                Map.of(1L, 1.0, 2L, 2.0, 3L, 0.0), Set.of()));
        assertThat(result.days().getFirst().targets()).extracting(VisitTarget::id).containsExactly(2L);
        assertThat(result.kpis().coveredRevenue()).isEqualTo(60);
        assertThat(result.kpis().eligibleRevenue()).isEqualTo(160);
        assertThat(result.kpis().coverage()).isEqualTo(0.375);
        assertThat(result.kpis().upperBoundRevenue()).isEqualTo(100);
    }

    @Test
    void filtersAgentsBeforeCountingExclusionsAndAppliesStrictMinimum() {
        var missing = new PlannerPoint(3, "C", "P", "Missing", "Rome", "A", null, Map.of(1L, 90.0));
        var result = planner.plan(List.of(point(1, "One", "A", 100), point(2, "Two", "B", 500),
                missing, located(4, 1, 300), point(5, "Five", "A", 50), located(6, .3, 200)),
                custom(480, 480, 1, 2, 50, Map.of(1L, 1.0), Set.of("A")));
        assertThat(result.excludedNotGeocoded()).isEqualTo(1);
        assertThat(result.kpis().excludedOutOfRange()).isEqualTo(1);
        assertThat(result.kpis().eligibleRevenue()).isEqualTo(300);
        // In range but too far for this day's time budget: eligible, but not scheduled.
        assertThat(result.notPlanned()).extracting(VisitTarget::id).containsExactly(6L);
    }

    @Test
    void clipsNegativeRowsBeforeGroupingAndUsesCityAndAgentInTheGroupingKey() {
        var same = point(2, " one ", "A", -50);
        var otherCity = new PlannerPoint(3, "C", "P", "One", "Milan", "A", base, Map.of(1L, 100.0));
        var result = planner.plan(List.of(point(1, "One", "A", 100), same, otherCity,
                point(4, "One", "B", 100)), custom(30, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of()));
        assertThat(result.kpis().plannedVisits()).isEqualTo(3);
        assertThat(result.kpis().coveredRevenue()).isEqualTo(300);
    }

    @Test
    void keepsEmptyPlansFiniteAndListsOnlyTheTopTwentyEligibleTargets() {
        var empty = planner.plan(List.of(), parameters(PlanningMode.PER_AGENT, 1));
        assertThat(empty.kpis().coverage()).isZero();
        assertThat(empty.kpis().lastVisitDate()).isNull();
        assertThat(empty.days()).isEmpty();
        var points = new ArrayList<PlannerPoint>();
        for (int i = 1; i <= 25; i++) points.add(point(i, "Address " + i, "A", i));
        var result = planner.plan(points, custom(480, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of()));
        assertThat(result.notPlanned()).hasSize(20);
        assertThat(result.notPlanned().getFirst().id()).isEqualTo(24);
        assertThat(result.notPlanned().getLast().id()).isEqualTo(5);
    }

    @Test
    void stopsFillingWhenAdditionalValueDoesNotPayForTravel() {
        var result = planner.plan(List.of(located(1, 0, 100), located(2, .01, 1)),
                parameters(PlanningMode.SINGLE_VISITOR, 1));
        assertThat(result.kpis().plannedVisits()).isEqualTo(1);
        assertThat(result.kpis().coveredRevenue()).isEqualTo(100);
    }

    @Test
    void includesReturnToBaseAndNeverRoundsAwayTravelMinutes() {
        var p = custom(240, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of());
        var result = planner.plan(List.of(located(1, 0, 100), located(2, .000001, 90)), p);
        assertThat(result.kpis().plannedVisits()).isEqualTo(1);
        var one = planner.plan(List.of(located(1, .1, 100)), parameters(PlanningMode.SINGLE_VISITOR, 1));
        assertThat(one.kpis().totalKm()).isCloseTo(2 * TravelModel.DEFAULT.roadDistanceKm(base,
                new GeoPoint(0, .1)), within(1e-10));
        assertThat(one.kpis().travelHours()).isCloseTo(one.kpis().totalKm() / 25, within(1e-10));
    }

    @Test
    void localSearchCanReplaceTheSeedToImproveTheRouteObjective() {
        // Replacing the distant seed loses little value and removes most of the travel.
        var result = planner.plan(List.of(located(1, .07, 100), located(2, -.001, 99),
                located(3, -.002, 98)), custom(210, 480, 1, 2, 0, Map.of(1L, 1.0), Set.of()));
        assertThat(result.days().getFirst().targets()).extracting(VisitTarget::id).doesNotContain(1L);
    }

    @Test
    void usesRoadDistancesForTheRangeAndRoadTimesForTheWorkday() {
        var near = located(1, .01, 100);
        var other = located(2, -.01, 90);
        var far = located(3, .02, 300);
        List<GeoPoint> points = List.of(base, near.location(), other.location(), far.location());
        // Straight-line estimate: all within 3 km and 8 minutes. By road: 90 km to "far", 20 minutes to each
        // of the others and 30 minutes between them.
        double[][] km = {{0, 5, 6, 90}, {5, 0, 8, 90}, {6, 8, 0, 90}, {90, 90, 90, 0}};
        double[][] minutes = {{0, 20, 20, 70}, {20, 0, 30, 70}, {20, 30, 0, 70}, {70, 70, 70, 0}};
        var estimate = custom(210, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of());
        var roads = new PlannerParameters(estimate.startDate(), estimate.deadline(), estimate.workingDays(),
                estimate.enterpriseWeights(), estimate.agents(), estimate.planningMode(), base,
                estimate.constraints(), estimate.travel(), estimate.travelCostPerKm(), estimate.minRevenue(),
                new RoadMatrix(points, km, minutes).over(estimate.travel()));

        assertThat(planner.plan(List.of(near, other, far), estimate).kpis().plannedVisits()).isEqualTo(2);
        var result = planner.plan(List.of(near, other, far), roads);
        assertThat(result.kpis().excludedOutOfRange()).isEqualTo(1);
        // Two visits (420 min) leave 60 minutes; the round through both takes 70 minutes by road.
        assertThat(result.days().getFirst().targets()).extracting(VisitTarget::id).containsExactly(1L);
        assertThat(result.days().getFirst().km()).isEqualTo(10);
        assertThat(result.days().getFirst().travelMinutes()).isEqualTo(40);
        assertThat(result.kpis().totalKm()).isEqualTo(10);
        assertThat(result.kpis().travelHours()).isCloseTo(40 / 60.0, within(1e-12));
    }

    @Test
    void rejectsDuplicatePointIds() {
        var a = point(1, "One", "A", 100);
        assertThatThrownBy(() -> planner.plan(List.of(a, a), parameters(PlanningMode.PER_AGENT, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void frontLoadsTheMostValuableDayAfterBuildingRoutes() {
        var result = planner.plan(List.of(located(1, .2, 200), located(2, -.01, 150), located(3, -.02, 140)),
                parameters(PlanningMode.SINGLE_VISITOR, 2));
        assertThat(result.days().getFirst().targets()).extracting(VisitTarget::id).containsExactlyInAnyOrder(2L, 3L);
        assertThat(result.days().getLast().targets()).extracting(VisitTarget::id).containsExactly(1L);
    }

    @Test
    void findsTheShortestOrderForThreeStops() {
        var a = located(1, .02, 300);
        var b = located(2, -.01, 200);
        var c = new PlannerPoint(3, "C3", "P3", "Third", "Rome", "A", new GeoPoint(.01, .01), Map.of(1L, 100.0));
        var p = custom(30, 480, 1, 0, 0, Map.of(1L, 1.0), Set.of());
        var result = planner.plan(List.of(a, b, c), p);
        double best = List.of(List.of(a, b, c), List.of(a, c, b), List.of(b, a, c),
                List.of(b, c, a), List.of(c, a, b), List.of(c, b, a)).stream()
                .mapToDouble(order -> p.travel().roundTripKm(base, order.stream().map(PlannerPoint::location).toList()))
                .min().orElseThrow();
        assertThat(result.days().getFirst().km()).isCloseTo(best, within(1e-10));
    }

    @Test
    void excludesAllTargetsWhenWeightsAreEmptyAndKeepsParallelUpperBoundPerAgent() {
        var points = List.of(point(1, "One", "A", 100), point(2, "Two", "A", 90),
                point(3, "Three", "A", 80), point(4, "Four", "B", 10));
        assertThat(planner.plan(points, custom(30, 480, 1, 0, 0, Map.of(), Set.of())).days()).isEmpty();
        var result = planner.plan(points, parameters(PlanningMode.PER_AGENT, 1));
        assertThat(result.kpis().upperBoundRevenue()).isEqualTo(200);
        assertThat(result.kpis().coveredRevenue()).isEqualTo(200);
    }

    @Test
    void plansOneThousandSyntheticPointsInUnderTwoSecondsWithFeasibleDeterministicRoutes() {
        var points = new ArrayList<PlannerPoint>();
        for (int i = 1; i <= 1000; i++) {
            points.add(located(i, (i % 101 - 50) * .001, 1000 - i * .5));
        }
        var p = custom(30, 480, 20, 2, 0, Map.of(1L, 1.0), Set.of());
        var result = assertTimeout(Duration.ofSeconds(2), () -> planner.plan(points, p));
        for (var day : result.days()) {
            assertThat(day.targets().size() * 30 + day.travelMinutes()).isLessThanOrEqualTo(480);
        }
        assertThat(result.days().stream().flatMap(day -> day.targets().stream()).map(VisitTarget::id).toList())
                .doesNotHaveDuplicates();
        Collections.reverse(points);
        assertThat(planner.plan(points, p)).isEqualTo(result);
        assertThat(result.kpis().upperBoundRevenue()).isGreaterThanOrEqualTo(result.kpis().coveredRevenue());
    }
}
