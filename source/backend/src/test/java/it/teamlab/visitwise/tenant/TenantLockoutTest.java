package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** AUTHENTICATION.md A9: lock after 5 consecutive failures for 1 min, doubling up to 15 min; reset on success. */
class TenantLockoutTest {

    private static final OffsetDateTime NOW = OffsetDateTime.of(2026, 9, 28, 10, 0, 0, 0, ZoneOffset.UTC);

    private final Tenant tenant = new Tenant("Demo federation", "demo@visitwise.test", "{argon2}hash");

    private void fail(int times) {
        for (int i = 0; i < times; i++) {
            tenant.recordFailedLogin(NOW);
        }
    }

    @Test
    void fourFailuresDoNotLock() {
        fail(4);

        assertThat(tenant.getFailedLoginCount()).isEqualTo(4);
        assertThat(tenant.isLocked(NOW)).isFalse();
    }

    @Test
    void fifthFailureLocksForOneMinute() {
        fail(5);

        assertThat(tenant.getLockedUntil()).isEqualTo(NOW.plusMinutes(1));
        assertThat(tenant.isLocked(NOW.plusSeconds(59))).isTrue();
        assertThat(tenant.isLocked(NOW.plusMinutes(1))).isFalse();
    }

    @Test
    void eachFailureAfterALockExpiresDoublesTheLockUpToFifteenMinutes() {
        fail(5);
        OffsetDateTime at = tenant.getLockedUntil();
        for (int expectedMinutes : new int[] {2, 4, 8, 15, 15, 15}) {
            tenant.recordFailedLogin(at);
            assertThat(tenant.getLockedUntil()).isEqualTo(at.plusMinutes(expectedMinutes));
            at = tenant.getLockedUntil();
        }
    }

    @Test
    void attemptsDuringAnActiveLockAreIgnored() {
        fail(5);

        tenant.recordFailedLogin(NOW.plusSeconds(30));

        assertThat(tenant.getFailedLoginCount()).isEqualTo(5);
        assertThat(tenant.getLockedUntil()).isEqualTo(NOW.plusMinutes(1));
    }

    @Test
    void successfulLoginResetsFailuresAndLockAndRecordsTheTime() {
        fail(5);

        tenant.recordSuccessfulLogin(NOW);

        assertThat(tenant.getFailedLoginCount()).isZero();
        assertThat(tenant.getLockedUntil()).isNull();
        assertThat(tenant.isLocked(NOW)).isFalse();
        assertThat(tenant.getLastLoginAt()).isEqualTo(NOW);
    }
}
