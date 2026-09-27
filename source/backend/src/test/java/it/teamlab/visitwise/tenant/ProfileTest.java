package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.csrfCookie;
import static it.teamlab.visitwise.tenant.AuthTestSupport.login;
import static it.teamlab.visitwise.tenant.AuthTestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Step 5 of AUTHENTICATION.md: profile API (endpoints 24-25, US-34). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class ProfileTest {

    private static final String EMAIL = "demo@visitwise.test";
    private static final String PASSWORD = "correct horse battery";
    private static final String NEW_PASSWORD = "a brand new passphrase";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    private Tenant tenant;
    private MockHttpSession session;

    @BeforeEach
    void createTenantAndLogIn() throws Exception {
        tenant = tenants.saveAndFlush(new Tenant("Demo federation", EMAIL, passwordEncoder.encode(PASSWORD)));
        session = new MockHttpSession();
        login(mvc, session, EMAIL, PASSWORD).andExpect(status().isOk());
    }

    private ResultActions rename(MockHttpSession session, String name) throws Exception {
        return mvc.perform(withCsrf(patch("/api/profile"), csrfCookie(mvc))
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ \"name\": \"" + name + "\" }"));
    }

    private ResultActions changePassword(MockHttpSession session, String current, String next) throws Exception {
        return mvc.perform(withCsrf(put("/api/profile/password"), csrfCookie(mvc))
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ \"currentPassword\": \"" + current + "\", \"newPassword\": \"" + next + "\" }"));
    }

    @Test
    void renamesTheTenant() throws Exception {
        rename(session, "  Renamed federation ")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed federation"))
                .andExpect(jsonPath("$.email").value(EMAIL));

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(jsonPath("$.name").value("Renamed federation"));
    }

    @Test
    void rejectsABlankOrTooLongName() throws Exception {
        rename(session, "   ")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("name: must not be blank"));
        rename(session, "x".repeat(151)).andExpect(status().isBadRequest());
    }

    @Test
    void profileNeedsASession() throws Exception {
        rename(new MockHttpSession(), "Anything").andExpect(status().isUnauthorized());
        changePassword(new MockHttpSession(), PASSWORD, NEW_PASSWORD).andExpect(status().isUnauthorized());
    }

    @Test
    void changesThePassword() throws Exception {
        OffsetDateTime before = tenant.getPasswordChangedAt();

        changePassword(session, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        login(mvc, EMAIL, PASSWORD).andExpect(status().isUnauthorized());
        login(mvc, EMAIL, NEW_PASSWORD).andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        Tenant reloaded = tenants.findByEmail(EMAIL).orElseThrow();
        assertThat(reloaded.getPasswordHash()).startsWith("{argon2}$argon2id$");
        assertThat(reloaded.getPasswordChangedAt()).isAfter(before);
    }

    @Test
    void rejectsAWrongCurrentPasswordAndKeepsTheOldOne() throws Exception {
        changePassword(session, "not my password", NEW_PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Current password is incorrect"));

        login(mvc, EMAIL, PASSWORD).andExpect(status().isOk());
    }

    @Test
    void theNewPasswordFollowsThePasswordPolicy() throws Exception {
        changePassword(session, PASSWORD, "short")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Password must be at least 8 characters"));
    }

    @Test
    void passwordChangeRotatesTheSessionIdAndKeepsTheUserLoggedIn() throws Exception {
        String before = session.getId();

        changePassword(session, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        assertThat(session.getId()).isNotEqualTo(before);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());
    }

    @Test
    void passwordChangeLogsOutTheOtherSessions() throws Exception {
        MockHttpSession otherDevice = new MockHttpSession();
        login(mvc, otherDevice, EMAIL, PASSWORD).andExpect(status().isOk());

        changePassword(session, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/me").session(otherDevice))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());
    }

    @Test
    void logsThePasswordChangeButNeverThePasswords(CapturedOutput output) throws Exception {
        changePassword(session, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        assertThat(output).contains("Password changed").contains(EMAIL);
        assertThat(output).doesNotContain(PASSWORD).doesNotContain(NEW_PASSWORD);
    }
}
