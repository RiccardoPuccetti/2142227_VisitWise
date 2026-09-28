package it.teamlab.visitwise.tenant;

import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Password hashing (AUTHENTICATION.md A3): Argon2id with the OWASP parameters (m = 19 MiB, t = 2, p = 1, 16-byte salt,
 * 32-byte hash), stored with the {@code {argon2}} prefix so the algorithm can be changed later without a migration.
 * Passwords are NFKC-normalized before hashing and before verification.
 */
@Configuration
public class PasswordConfig {

    private static final String ENCODING_ID = "argon2";

    @Bean
    public PasswordEncoder passwordEncoder() {
        return createPasswordEncoder();
    }

    public static PasswordEncoder createPasswordEncoder() {
        PasswordEncoder argon2id = new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);
        return new NormalizingPasswordEncoder(new DelegatingPasswordEncoder(ENCODING_ID, Map.of(ENCODING_ID, argon2id)));
    }

    /** Applies {@link PasswordPolicy#normalize} to the raw password, then delegates. */
    private record NormalizingPasswordEncoder(PasswordEncoder delegate) implements PasswordEncoder {

        @Override
        public String encode(CharSequence rawPassword) {
            return delegate.encode(PasswordPolicy.normalize(rawPassword.toString()));
        }

        @Override
        public boolean matches(CharSequence rawPassword, String encodedPassword) {
            return delegate.matches(PasswordPolicy.normalize(rawPassword.toString()), encodedPassword);
        }

        @Override
        public boolean upgradeEncoding(String encodedPassword) {
            return delegate.upgradeEncoding(encodedPassword);
        }
    }
}
