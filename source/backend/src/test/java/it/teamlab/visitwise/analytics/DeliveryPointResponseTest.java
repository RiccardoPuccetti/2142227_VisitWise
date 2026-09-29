package it.teamlab.visitwise.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.Enterprise;
import it.teamlab.visitwise.imports.ImportBatch;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** The one mapping of a delivery point for the API (endpoints 7, 8 and the plans' points left out). */
class DeliveryPointResponseTest {

    @Test
    void listsTheRevenueLinesInTheEnterpriseOrderOfTheImport() {
        ImportBatch batch = new ImportBatch(1L, "Sample", "sample.xlsx");
        Enterprise first = new Enterprise(batch, "B", "FIRST", "#0072B2", 0);
        Enterprise second = new Enterprise(batch, "C", "SECOND", "#009E73", 1);
        DeliveryPoint point = new DeliveryPoint(batch, 2, "ACME", "ACME ROMA", "Via Roma 1", "Roma", "NORTH");
        point.addRevenue(second, new BigDecimal("200.00"));
        point.addRevenue(first, new BigDecimal("100.00"));

        DeliveryPointResponse response = DeliveryPointResponse.of(point);

        assertThat(response.revenues()).extracting(RevenueLine::amount)
                .containsExactly(new BigDecimal("100.00"), new BigDecimal("200.00"));
        assertThat(response.pointName()).isEqualTo("ACME ROMA");
        assertThat(response.city()).isEqualTo("Roma");
    }
}
