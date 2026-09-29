package it.teamlab.visitwise.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextTest {

    @Test
    void cutsATextToTheColumnLength() {
        assertThat(Text.truncate("VIA ROMA", 3)).isEqualTo("VIA");
        assertThat(Text.truncate("VIA", 3)).isEqualTo("VIA");
    }

    @Test
    void removesTheAccentsAndKeepsTheLetters() {
        assertThat(Text.withoutAccents("CITTÀ Forlì")).isEqualTo("CITTA Forli");
    }
}
