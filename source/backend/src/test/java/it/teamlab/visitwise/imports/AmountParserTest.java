package it.teamlab.visitwise.imports;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Revenue cells (API_CONTRACT.md, parsing rules): empty or '-' = 0, ',' or '.' decimals, negatives allowed. */
class AmountParserTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"-", "  -  ", "   "})
    void emptyOrDashIsZero(String cell) {
        assertThat(AmountParser.parse(cell)).contains(new BigDecimal("0.00"));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "830|830.00",
            "1250.5|1250.50",
            "1250,5|1250.50",
            "-120.3|-120.30",
            "0.30000000000000004|0.30",
            "2.345|2.35",
            "1.250,50|1250.50",
            "1,250.50|1250.50",
            "1.234.567,89|1234567.89",
            "1,234,567|1234567.00",
            "€ 1.250,50|1250.50",
            "' 830 '|830.00",
    })
    void numbersWithEitherDecimalSeparatorAreRoundedToCents(String cell, String expected) {
        assertThat(AmountParser.parse(cell)).contains(new BigDecimal(expected));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "12a", "1,2.3,4", "--5", "ERROR:#DIV/0!", "1e3"})
    void anythingElseIsNotAnAmount(String cell) {
        assertThat(AmountParser.parse(cell)).isEmpty();
    }
}
