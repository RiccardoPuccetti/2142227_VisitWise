package it.teamlab.visitwise.tenant;

import java.text.Normalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Password rules (AUTHENTICATION.md A2, NIST SP 800-63B-4, OWASP ASVS 5.0 V6.2): length only, counted in Unicode code
 * points after NFKC normalization; no composition rules. The minimum is configurable
 * ({@code visitwise.auth.password.min-length}).
 */
@Component
public class PasswordPolicy {

    public static final int MAX_LENGTH = 64;

    private final int minLength;

    public PasswordPolicy(@Value("${visitwise.auth.password.min-length:8}") int minLength) {
        if (minLength < 1 || minLength > MAX_LENGTH) {
            throw new IllegalArgumentException(
                    "visitwise.auth.password.min-length must be between 1 and " + MAX_LENGTH + ", was " + minLength);
        }
        this.minLength = minLength;
    }

    /** Same normalization used when hashing and verifying (see {@link PasswordConfig}). */
    public static String normalize(String password) {
        return Normalizer.normalize(password, Normalizer.Form.NFKC);
    }

    /** @throws IllegalArgumentException with a message that can be shown to the user */
    public void check(String password) {
        if (password == null) {
            throw new IllegalArgumentException("Password is required");
        }
        String normalized = normalize(password);
        int length = normalized.codePointCount(0, normalized.length());
        if (length < minLength) {
            throw new IllegalArgumentException("Password must be at least " + minLength + " characters");
        }
        if (length > MAX_LENGTH) {
            throw new IllegalArgumentException("Password must be at most " + MAX_LENGTH + " characters");
        }
    }
}
