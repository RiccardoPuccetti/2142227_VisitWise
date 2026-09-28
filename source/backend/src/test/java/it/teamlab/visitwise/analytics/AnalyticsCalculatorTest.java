package it.teamlab.visitwise.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import it.teamlab.visitwise.imports.GeocodeStatus;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** US-18: indicators by enterprise, agent and city, top points and revenue concentration. */
class AnalyticsCalculatorTest {

    private static final EnterpriseInfo A = new EnterpriseInfo(21L, "ENTERPRISE A", "#2563eb");
    private static final EnterpriseInfo B = new EnterpriseInfo(22L, "ENTERPRISE B", "#dc2626");
    private static final EnterpriseInfo C = new EnterpriseInfo(23L, "ENTERPRISE C", "#16a34a");
    private static final List<EnterpriseInfo> ENTERPRISES = List.of(A, B, C);

    private static BigDecimal eur(String amount) {
        return new BigDecimal(amount);
    }

    /** A point with revenue lines given as enterpriseId, amount, enterpriseId, amount, ... */
    private static DeliveryPointResponse point(long id, String customer, String agent, String city, Object... lines) {
        List<RevenueLine> revenues = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < lines.length; i += 2) {
            BigDecimal amount = eur((String) lines[i + 1]);
            revenues.add(new RevenueLine((Long) lines[i], amount));
            total = total.add(amount);
        }
        return new DeliveryPointResponse(id, (int) id + 1, customer, customer + " POINT", "VIA DEL CORSO " + id, city,
                agent, 41.9, 12.5, GeocodeStatus.OK, total, revenues);
    }

    private static final List<DeliveryPointResponse> POINTS = List.of(
            point(1, "ACME SRL", "AGENT NORTH", "ROMA", 21L, "1000.00", 22L, "500.00"),
            point(2, "ACME SRL", "AGENT NORTH", "TIVOLI", 21L, "300.00"),
            point(3, "BETA SRL", "AGENT SOUTH", "ROMA", 23L, "2000.00"),
            point(4, "GAMMA SNC", null, "ROMA", 22L, "200.00"));

    private static AnalyticsSummary all() {
        return AnalyticsCalculator.summarize(ENTERPRISES, POINTS, Set.of(), Set.of());
    }

    @Test
    void totalsCoverEveryPointAndCountDistinctCustomers() {
        AnalyticsSummary summary = all();

        assertThat(summary.totalRevenue()).isEqualByComparingTo("4000.00");
        assertThat(summary.pointCount()).isEqualTo(4);
        assertThat(summary.customerCount()).isEqualTo(3);
    }

    @Test
    void enterprisesKeepTheirOrderWithRevenueAndPointsWithRevenue() {
        assertThat(all().byEnterprise()).containsExactly(
                new EnterpriseAmount(21L, "ENTERPRISE A", "#2563eb", eur("1300.00"), 2),
                new EnterpriseAmount(22L, "ENTERPRISE B", "#dc2626", eur("700.00"), 2),
                new EnterpriseAmount(23L, "ENTERPRISE C", "#16a34a", eur("2000.00"), 1));
    }

    @Test
    void agentsAndCitiesAreSortedByRevenueWithAKeyForPointsWithoutAgent() {
        AnalyticsSummary summary = all();

        assertThat(summary.byAgent()).containsExactly(
                new NamedAmount("AGENT SOUTH", eur("2000.00"), 1),
                new NamedAmount("AGENT NORTH", eur("1800.00"), 2),
                new NamedAmount(AnalyticsCalculator.NO_AGENT, eur("200.00"), 1));
        assertThat(summary.byCity()).containsExactly(
                new NamedAmount("ROMA", eur("3700.00"), 3),
                new NamedAmount("TIVOLI", eur("300.00"), 1));
    }

    @Test
    void enterpriseFilterCountsOnlyTheirRevenueAndOnlyPointsThatHaveSome() {
        AnalyticsSummary summary = AnalyticsCalculator.summarize(ENTERPRISES, POINTS, Set.of(22L), Set.of());

        assertThat(summary.totalRevenue()).isEqualByComparingTo("700.00");
        assertThat(summary.pointCount()).isEqualTo(2);
        assertThat(summary.customerCount()).isEqualTo(2);
        assertThat(summary.byEnterprise()).extracting(EnterpriseAmount::enterpriseId).containsExactly(22L);
        assertThat(summary.topPoints()).extracting(DeliveryPointResponse::id).containsExactly(1L, 4L);
    }

    @Test
    void agentFilterKeepsOnlyTheirPoints() {
        AnalyticsSummary summary = AnalyticsCalculator.summarize(ENTERPRISES, POINTS, Set.of(), Set.of("AGENT NORTH"));

        assertThat(summary.totalRevenue()).isEqualByComparingTo("1800.00");
        assertThat(summary.pointCount()).isEqualTo(2);
        assertThat(summary.byAgent()).extracting(NamedAmount::key).containsExactly("AGENT NORTH");
        assertThat(summary.byEnterprise()).extracting(EnterpriseAmount::pointCount).containsExactly(2, 1, 0);
    }

    @Test
    void anEnterpriseOfAnotherImportIsRejected() {
        assertThatThrownBy(() -> AnalyticsCalculator.summarize(ENTERPRISES, POINTS, Set.of(99L), Set.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Enterprise 99 is not part of this import");
    }

    @Test
    void topPointsAreTheTenLargestByFilteredRevenueWithTiesById() {
        List<DeliveryPointResponse> many = IntStream.rangeClosed(1, 12)
                .mapToObj(i -> point(i, "C" + i, "AGENT NORTH", "ROMA", 21L, i <= 3 ? "50.00" : i + "00.00"))
                .toList();

        List<DeliveryPointResponse> top = AnalyticsCalculator.summarize(ENTERPRISES, many, Set.of(), Set.of()).topPoints();

        assertThat(top).extracting(DeliveryPointResponse::id)
                .containsExactly(12L, 11L, 10L, 9L, 8L, 7L, 6L, 5L, 4L, 1L);
    }

    @Test
    void topPointsKeepAllTheirRevenueLines() {
        DeliveryPointResponse first = AnalyticsCalculator.summarize(ENTERPRISES, POINTS, Set.of(22L), Set.of())
                .topPoints().get(0);

        assertThat(first.id()).isEqualTo(1L);
        assertThat(first.revenues()).hasSize(2);
    }

    @Test
    void paretoHasOneEntryPerPointWithTheCumulativeShareOfTheLargest() {
        assertThat(all().pareto()).containsExactly(
                new ParetoPoint(1, 0.5),
                new ParetoPoint(2, 0.875),
                new ParetoPoint(3, 0.95),
                new ParetoPoint(4, 1.0));
    }

    @Test
    void paretoSharesAreRoundedToFourDecimals() {
        List<DeliveryPointResponse> thirds = List.of(
                point(1, "X", "A", "ROMA", 21L, "1.00"),
                point(2, "Y", "A", "ROMA", 21L, "1.00"),
                point(3, "Z", "A", "ROMA", 21L, "1.00"));

        assertThat(AnalyticsCalculator.summarize(ENTERPRISES, thirds, Set.of(), Set.of()).pareto())
                .extracting(ParetoPoint::revenueShare)
                .containsExactly(0.3333, 0.6667, 1.0);
    }

    @Test
    void creditNotesAreSummedAsNetRevenue() {
        List<DeliveryPointResponse> withCreditNote = List.of(
                point(1, "X", "A", "ROMA", 21L, "500.00"),
                point(2, "Y", "A", "ROMA", 21L, "-104.66"));

        AnalyticsSummary summary = AnalyticsCalculator.summarize(ENTERPRISES, withCreditNote, Set.of(), Set.of());

        assertThat(summary.totalRevenue()).isEqualByComparingTo("395.34");
        assertThat(summary.byEnterprise().get(0).revenue()).isEqualByComparingTo("395.34");
    }

    @Test
    void anEmptyImportGivesZeroTotalsAndNoCurve() {
        AnalyticsSummary summary = AnalyticsCalculator.summarize(ENTERPRISES, List.of(), Set.of(), Set.of());

        assertThat(summary.totalRevenue()).isEqualByComparingTo("0.00");
        assertThat(summary.pointCount()).isZero();
        assertThat(summary.byEnterprise()).extracting(EnterpriseAmount::pointCount).containsExactly(0, 0, 0);
        assertThat(summary.byAgent()).isEmpty();
        assertThat(summary.topPoints()).isEmpty();
        assertThat(summary.pareto()).isEmpty();
    }

    @Test
    void amountsHaveTwoDecimals() {
        AnalyticsSummary summary = all();

        assertThat(summary.totalRevenue().scale()).isEqualTo(2);
        assertThat(summary.byEnterprise().get(0).revenue().scale()).isEqualTo(2);
        assertThat(summary.byCity().get(0).revenue().scale()).isEqualTo(2);
    }
}
