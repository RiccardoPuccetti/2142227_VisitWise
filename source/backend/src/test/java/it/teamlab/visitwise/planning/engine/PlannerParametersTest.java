package it.teamlab.visitwise.planning.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PlannerParametersTest {
    private PlannerParameters parameters(int days, Map<Long, Double> weights, Set<String> agents,
                                         double penalty, double minimum) {
        return new PlannerParameters(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1), days,
                weights, agents, PlanningMode.PER_AGENT, new GeoPoint(0, 0),
                VisitConstraints.DEFAULT, TravelModel.DEFAULT, penalty, minimum, null);
    }

    @ParameterizedTest
    @ValueSource(doubles = {-1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsInvalidWeightsPenaltyAndMinimum(double value) {
        assertThatThrownBy(() -> parameters(1, Map.of(1L, value), Set.of(), 0, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parameters(1, Map.of(1L, 1.0), Set.of(), value, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parameters(1, Map.of(1L, 1.0), Set.of(), 0, value))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 261})
    void rejectsInvalidHorizons(int days) {
        assertThatThrownBy(() -> parameters(days, Map.of(), Set.of(), 0, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void defensivelyCopiesInputsAndOutputs() {
        var weights = new HashMap<>(Map.of(1L, 1.0));
        var agents = new HashSet<>(Set.of("A"));
        var p = parameters(1, weights, agents, 0, 0);
        var point = new PlannerPoint(1, "C", "Address", "City", "A", new GeoPoint(0, 0), weights);
        weights.clear();
        agents.clear();
        assertThat(p.enterpriseWeights()).containsEntry(1L, 1.0);
        assertThat(p.agents()).containsExactly("A");
        assertThat(point.revenues()).containsEntry(1L, 1.0);
        var result = new GreedyVisitPlanner().plan(List.of(point), p);
        assertThatThrownBy(() -> result.days().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> result.days().getFirst().targets().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> result.days().getFirst().targets().getFirst().points().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void rejectsMissingInputsInvalidIdsAndOverflowingRevenue() {
        var planner = new GreedyVisitPlanner();
        var p = parameters(1, Map.of(1L, 2.0), Set.of(), 0, 0);
        assertThatThrownBy(() -> planner.plan(null, p)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> planner.plan(List.of(), null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parameters(1, Map.of(0L, 1.0), Set.of(), 0, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PlannerPoint(0, "C", "A", "City", "", null, Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PlannerPoint(1, "C", "A", "City", "", null, Map.of(1L, Double.NaN)))
                .isInstanceOf(IllegalArgumentException.class);
        var huge = new PlannerPoint(1, "C", "A", "City", "", new GeoPoint(0, 0), Map.of(1L, Double.MAX_VALUE));
        assertThatThrownBy(() -> planner.plan(List.of(huge), p)).isInstanceOf(IllegalArgumentException.class);
    }
}
