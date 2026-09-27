package it.teamlab.visitwise.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Computes the analytics summary of an import (US-18). Pure Java: no Spring, no JPA.
 *
 * <p>Filters: an empty collection means "all". With an enterprise filter only the revenue of those enterprises is
 * counted, and a point is included only if it has revenue in at least one of them. With an agent filter only the
 * points of those agents are included. Amounts are summed as they are (net revenue: credit notes reduce it).
 */
public final class AnalyticsCalculator {

    /** Key used in {@code byAgent} for points without an agent. */
    public static final String NO_AGENT = "(no agent)";

    static final int TOP_POINTS = 10;

    private AnalyticsCalculator() {
    }

    /** A point that passed the filters, with its revenue restricted to the selected enterprises. */
    private record Included(DeliveryPointResponse point, BigDecimal revenue) {
    }

    public static AnalyticsSummary summarize(List<EnterpriseInfo> enterprises, List<DeliveryPointResponse> points,
                                             Collection<Long> enterpriseIds, Collection<String> agentFilter) {
        // Copy: immutable sets (Set.of) throw on contains(null), and points may have no agent.
        Set<String> agents = new HashSet<>(agentFilter);
        Set<Long> known = new HashSet<>();
        enterprises.forEach(enterprise -> known.add(enterprise.id()));
        for (Long id : enterpriseIds) {
            if (!known.contains(id)) {
                throw new IllegalArgumentException("Enterprise " + id + " is not part of this import");
            }
        }
        List<EnterpriseInfo> selected = enterpriseIds.isEmpty()
                ? enterprises
                : enterprises.stream().filter(enterprise -> enterpriseIds.contains(enterprise.id())).toList();
        Set<Long> selectedIds = new HashSet<>();
        selected.forEach(enterprise -> selectedIds.add(enterprise.id()));

        List<Included> included = new ArrayList<>();
        for (DeliveryPointResponse point : points) {
            if (!agents.isEmpty() && !agents.contains(point.agent())) {
                continue;
            }
            List<RevenueLine> lines = point.revenues().stream()
                    .filter(line -> selectedIds.contains(line.enterpriseId()))
                    .toList();
            if (!enterpriseIds.isEmpty() && lines.isEmpty()) {
                continue;
            }
            included.add(new Included(point, sum(lines.stream().map(RevenueLine::amount).toList())));
        }

        BigDecimal total = money(sum(included.stream().map(Included::revenue).toList()));
        List<Included> largestFirst = included.stream()
                .sorted(Comparator.comparing(Included::revenue).reversed()
                        .thenComparing(item -> item.point().id()))
                .toList();

        return new AnalyticsSummary(
                total,
                included.size(),
                (int) included.stream().map(item -> item.point().customerName()).distinct().count(),
                byEnterprise(selected, included),
                byKey(included, item -> item.point().agent() == null ? NO_AGENT : item.point().agent()),
                byKey(included, item -> item.point().city()),
                largestFirst.stream().limit(TOP_POINTS).map(Included::point).toList(),
                pareto(largestFirst, total));
    }

    private static List<EnterpriseAmount> byEnterprise(List<EnterpriseInfo> selected, List<Included> included) {
        return selected.stream().map(enterprise -> {
            List<BigDecimal> amounts = included.stream()
                    .flatMap(item -> item.point().revenues().stream())
                    .filter(line -> line.enterpriseId().equals(enterprise.id()))
                    .map(RevenueLine::amount)
                    .toList();
            return new EnterpriseAmount(enterprise.id(), enterprise.name(), enterprise.color(),
                    money(sum(amounts)), amounts.size());
        }).toList();
    }

    /** Revenue and point count per key, largest revenue first, ties by key. */
    private static List<NamedAmount> byKey(List<Included> included, Function<Included, String> key) {
        Map<String, List<Included>> groups = new LinkedHashMap<>();
        included.forEach(item -> groups.computeIfAbsent(key.apply(item), k -> new ArrayList<>()).add(item));
        return groups.entrySet().stream()
                .map(group -> new NamedAmount(group.getKey(),
                        money(sum(group.getValue().stream().map(Included::revenue).toList())),
                        group.getValue().size()))
                .sorted(Comparator.comparing(NamedAmount::revenue).reversed().thenComparing(NamedAmount::key))
                .toList();
    }

    /** Cumulative share of the total held by the k largest points, for every k. Zero total gives zero shares. */
    private static List<ParetoPoint> pareto(List<Included> largestFirst, BigDecimal total) {
        List<ParetoPoint> curve = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (int k = 0; k < largestFirst.size(); k++) {
            cumulative = cumulative.add(largestFirst.get(k).revenue());
            double share = total.signum() == 0
                    ? 0.0
                    : cumulative.divide(total, 4, RoundingMode.HALF_UP).doubleValue();
            curve.add(new ParetoPoint(k + 1, share));
        }
        return curve;
    }

    private static BigDecimal sum(List<BigDecimal> amounts) {
        return amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
