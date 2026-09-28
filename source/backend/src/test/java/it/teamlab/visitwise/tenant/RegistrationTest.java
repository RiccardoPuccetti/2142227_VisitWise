package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Step 3 of AUTHENTICATION.md: POST /api/auth/register (endpoint 20, US-31). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class RegistrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    private ResultActions register(String tenantName, String email, String password) throws Exception {
        String body = """
                { "tenantName": %s, "email": %s, "password": %s }
                """.formatted(json(tenantName), json(email), json(password));
        // Same flow as the SPA: token from the XSRF-TOKEN cookie, echoed in the X-XSRF-TOKEN header.
        Cookie csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        return mvc.perform(post("/api/auth/register")
                .cookie(csrf)
                .header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private static String json(String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    @Test
    void registersTenantAndStoresOnlyAnArgon2Hash() throws Exception {
        register("Demo federation", "  Demo@VisitWise.Test ", "correct horse battery")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Demo federation"))
                .andExpect(jsonPath("$.email").value("demo@visitwise.test"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        Tenant saved = tenants.findByEmail("demo@visitwise.test").orElseThrow();
        assertThat(saved.getPasswordHash()).startsWith("{argon2}$argon2id$");
    }

    @Test
    void registrationDoesNotLogIn() throws Exception {
        MvcResult result = register("Demo federation", "demo@visitwise.test", "correct horse battery")
                .andExpect(status().isCreated())
                .andReturn();

        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void rejectsAnEmailAlreadyRegisteredInAnyCase() throws Exception {
        register("First", "demo@visitwise.test", "correct horse battery").andExpect(status().isCreated());

        register("Second", "DEMO@VisitWise.test", "another good password")
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Email already registered"));
    }

    @Test
    void rejectsAPasswordShorterThanTheConfiguredMinimum() throws Exception {
        register("Demo federation", "demo@visitwise.test", "short")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Password must be at least 8 characters"));
    }

    @Test
    void rejectsAnInvalidEmail() throws Exception {
        register("Demo federation", "not-an-email", "correct horse battery")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("email: must be a well-formed email address"));
    }

    @Test
    void rejectsABlankTenantName() throws Exception {
        register("  ", "demo@visitwise.test", "correct horse battery")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("tenantName: must not be blank"));
    }

    @Test
    void logsTheRegistrationButNeverThePassword(CapturedOutput output) throws Exception {
        register("Demo federation", "demo@visitwise.test", "correct horse battery").andExpect(status().isCreated());

        assertThat(output).contains("Tenant registered").contains("demo@visitwise.test");
        assertThat(output).doesNotContain("correct horse battery");
    }
}
