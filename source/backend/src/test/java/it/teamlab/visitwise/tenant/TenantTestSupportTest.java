package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The CSRF helper every controller test uses must pass the real CSRF check and leave the application as it was:
 * Spring Security's {@code csrf()} post-processor swaps the token repository of the shared test context, after which
 * {@code /api/auth/csrf} stops issuing the {@code XSRF-TOKEN} cookie for every later test class.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TenantTestSupportTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void xsrfPassesTheCsrfCheckAndKeepsTheCookieRepository() throws Exception {
        // An invalid body proves the request went past the CSRF filter (400, not 403) without changing any data.
        mvc.perform(patch("/api/profile").with(asTenant(1L)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/profile").with(asTenant(1L))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/auth/csrf")).andExpect(cookie().exists("XSRF-TOKEN"));
    }
}
