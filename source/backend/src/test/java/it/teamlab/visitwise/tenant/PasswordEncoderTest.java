package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/** AUTHENTICATION.md decision A3: Argon2id with OWASP parameters, algorithm id prefix, NFKC before hashing. */
class PasswordEncoderTest {

    private final PasswordEncoder encoder = PasswordConfig.createPasswordEncoder();

    @Test
    void hashesWithArgon2idAndOwaspParameters() {
        String hash = encoder.encode("correct horse battery");

        assertThat(hash).startsWith("{argon2}$argon2id$v=19$m=19456,t=2,p=1$");
        assertThat(hash).doesNotContain("correct horse battery");
    }

    @Test
    void matchesOnlyTheRightPassword() {
        String hash = encoder.encode("correct horse battery");

        assertThat(encoder.matches("correct horse battery", hash)).isTrue();
        assertThat(encoder.matches("correct horse batterY", hash)).isFalse();
    }

    @Test
    void usesARandomSaltForEveryHash() {
        assertThat(encoder.encode("same password")).isNotEqualTo(encoder.encode("same password"));
    }

    @Test
    void normalizesNfkcSoEquivalentUnicodeFormsMatch() {
        // Full-width letters and digits (e.g. typed with an IME) are the same password as their ASCII form.
        String hash = encoder.encode("ｐａｓｓｗｏｒｄ１");

        assertThat(encoder.matches("password1", hash)).isTrue();
    }
}
