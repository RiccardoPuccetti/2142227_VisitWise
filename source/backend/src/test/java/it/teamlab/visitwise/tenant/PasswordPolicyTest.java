package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** AUTHENTICATION.md decision A2: configurable minimum, max 64, code points, no composition rules. */
class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy(8);

    @Test
    void acceptsPasswordOfExactlyTheMinimumLength() {
        assertThatCode(() -> policy.check("abcdefgh")).doesNotThrowAnyException();
    }

    @Test
    void rejectsPasswordShorterThanTheMinimum() {
        assertThatThrownBy(() -> policy.check("abcdefg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must be at least 8 characters");
    }

    @Test
    void acceptsSixtyFourAndRejectsSixtyFiveCharacters() {
        assertThatCode(() -> policy.check("a".repeat(64))).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.check("a".repeat(65)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must be at most 64 characters");
    }

    @Test
    void rejectsMissingPassword() {
        assertThatThrownBy(() -> policy.check(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password is required");
    }

    @Test
    void imposesNoCompositionRules() {
        assertThatCode(() -> policy.check("onlylowercaseletters")).doesNotThrowAnyException();
        assertThatCode(() -> policy.check("with spaces inside")).doesNotThrowAnyException();
    }

    @Test
    void countsUnicodeCodePointsNotUtf16Units() {
        String emoji = "😀"; // one code point, two UTF-16 units
        assertThatCode(() -> policy.check(emoji.repeat(8))).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.check(emoji.repeat(7))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void countsLengthAfterNfkcNormalization() {
        // U+FB03 "ffi" ligature becomes three characters after NFKC: 6 + 3 = 9 >= 8
        assertThatCode(() -> policy.check("abcdefﬃ")).doesNotThrowAnyException();
    }

    @Test
    void minimumLengthIsConfigurable() {
        PasswordPolicy strict = new PasswordPolicy(15);

        assertThatThrownBy(() -> strict.check("a".repeat(14)))
                .hasMessage("Password must be at least 15 characters");
        assertThatCode(() -> strict.check("a".repeat(15))).doesNotThrowAnyException();
    }

    @Test
    void rejectsMisconfiguredMinimumLength() {
        assertThatThrownBy(() -> new PasswordPolicy(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PasswordPolicy(65)).isInstanceOf(IllegalArgumentException.class);
    }
}
