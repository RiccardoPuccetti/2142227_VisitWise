package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.csrfCookie;
import static it.teamlab.visitwise.tenant.AuthTestSupport.login;
import static it.teamlab.visitwise.tenant.AuthTestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/** Step 4 of AUTHENTICATION.md: login, logout, me (endpoints 21-23, US-32). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class LoginTest {

    private static final String EMAIL = "demo@visitwise.test";
    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    private Tenant tenant;

    @BeforeEach
    void createTenant() {
        tenant = tenants.saveAndFlush(new Tenant("Demo federation", EMAIL, passwordEncoder.encode(PASSWORD)));
    }

    @Test
    void loginReturnsTheCurrentTenantAndTheSessionIsRecognisedByMe() throws Exception {
        MockHttpSession session = new MockHttpSession();

        login(mvc, session, EMAIL, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(tenant.getId()))
                .andExpect(jsonPath("$.name").value("Demo federation"))
                .andExpect(jsonPath("$.email").value(EMAIL));

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tenant.getId()))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    void loginChangesTheSessionIdAgainstSessionFixation() throws Exception {
        MockHttpSession session = new MockHttpSession();
        String before = session.getId();

        MvcResult result = login(mvc, session, EMAIL, PASSWORD).andExpect(status().isOk()).andReturn();

        assertThat(result.getRequest().getSession(false)).isNotNull();
        assertThat(result.getRequest().getSession(false).getId()).isNotEqualTo(before);
    }

    @Test
    void emailIsCaseInsensitiveAtLogin() throws Exception {
        login(mvc, "  DEMO@VisitWise.test ", PASSWORD).andExpect(status().isOk());
    }

    @Test
    void wrongPasswordUnknownEmailAndLockedAccountGetTheSameAnswer() throws Exception {
        String wrongPassword = login(mvc, EMAIL, "wrong password!").andReturn().getResponse().getContentAsString();
        String unknownEmail = login(mvc, "nobody@visitwise.test", PASSWORD).andReturn().getResponse().getContentAsString();
        lockTheAccount();
        MockHttpServletResponse locked = login(mvc, EMAIL, PASSWORD).andReturn().getResponse();

        assertThat(locked.getStatus()).isEqualTo(401);
        assertThat(locked.getContentType()).startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(locked.getContentAsString()).contains("\"detail\":\"Invalid email or password\"");
        assertThat(wrongPassword).isEqualTo(locked.getContentAsString());
        assertThat(unknownEmail).isEqualTo(locked.getContentAsString());
    }

    @Test
    void fiveConsecutiveFailuresLockTheAccountEvenForTheRightPassword() throws Exception {
        for (int i = 0; i < 5; i++) {
            login(mvc, EMAIL, "wrong password " + i).andExpect(status().isUnauthorized());
        }

        login(mvc, EMAIL, PASSWORD).andExpect(status().isUnauthorized());
        assertThat(tenants.findByEmail(EMAIL).orElseThrow().getLockedUntil()).isNotNull();
    }

    @Test
    void anExpiredLockAllowsLoginAgain() throws Exception {
        lockTheAccount();
        entityManager.createNativeQuery("UPDATE tenant SET locked_until = now() - interval '1 second' WHERE id = :id")
                .setParameter("id", tenant.getId())
                .executeUpdate();
        entityManager.clear();

        login(mvc, EMAIL, PASSWORD).andExpect(status().isOk());
    }

    @Test
    void successfulLoginResetsTheFailureCountAndRecordsTheTime() throws Exception {
        for (int i = 0; i < 4; i++) {
            login(mvc, EMAIL, "wrong password " + i);
        }

        login(mvc, EMAIL, PASSWORD).andExpect(status().isOk());

        // The test transaction wraps the requests: write the pending changes before reloading from the database.
        entityManager.flush();
        entityManager.clear();
        Tenant reloaded = tenants.findByEmail(EMAIL).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isZero();
        assertThat(reloaded.getLastLoginAt()).isNotNull();
    }

    @Test
    void loginWithoutCsrfTokenIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").param("username", EMAIL).param("password", PASSWORD))
                .andExpect(status().isForbidden());
    }

    @Test
    void meWithoutSessionAnswers401() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        login(mvc, session, EMAIL, PASSWORD).andExpect(status().isOk());

        mvc.perform(withCsrf(post("/api/auth/logout"), csrfCookie(mvc)).session(session))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void logsLoginSuccessFailureAndLogoutButNeverThePassword(CapturedOutput output) throws Exception {
        MockHttpSession session = new MockHttpSession();
        login(mvc, EMAIL, "wrong password!");
        login(mvc, session, EMAIL, PASSWORD);
        mvc.perform(withCsrf(post("/api/auth/logout"), csrfCookie(mvc)).session(session));

        assertThat(output).contains("Login failed").contains("Login succeeded").contains("Logout");
        assertThat(output).doesNotContain(PASSWORD).doesNotContain("wrong password!");
    }

    private void lockTheAccount() throws Exception {
        for (int i = 0; i < 5; i++) {
            login(mvc, EMAIL, "wrong password " + i);
        }
    }
}
