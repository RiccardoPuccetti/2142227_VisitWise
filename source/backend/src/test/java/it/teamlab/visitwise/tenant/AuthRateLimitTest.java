package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.csrfCookie;
import static it.teamlab.visitwise.tenant.AuthTestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** AUTHENTICATION.md A9: login and register attempts limited per client IP (limit lowered to 3 for the test). */
@SpringBootTest(properties = "visitwise.auth.rate-limit.per-minute=3")
@AutoConfigureMockMvc
class AuthRateLimitTest {

    @Autowired
    private MockMvc mvc;

    private MockHttpServletRequestBuilder loginFrom(String ip, Cookie csrf) {
        return withCsrf(post("/api/auth/login"), csrf)
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .param("username", "nobody@visitwise.test")
                .param("password", "whatever password");
    }

    @Test
    void theFourthAttemptInAMinuteFromTheSameIpAnswers429() throws Exception {
        Cookie csrf = csrfCookie(mvc);
        for (int i = 0; i < 3; i++) {
            mvc.perform(loginFrom("203.0.113.10", csrf)).andExpect(status().isUnauthorized());
        }

        mvc.perform(loginFrom("203.0.113.10", csrf))
                .andExpect(status().isTooManyRequests())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Too many attempts, try again later"))
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void otherIpsAreNotAffected() throws Exception {
        Cookie csrf = csrfCookie(mvc);
        for (int i = 0; i < 4; i++) {
            mvc.perform(loginFrom("203.0.113.20", csrf));
        }

        mvc.perform(loginFrom("203.0.113.21", csrf)).andExpect(status().isUnauthorized());
    }

    @Test
    void registrationSharesTheLimit() throws Exception {
        Cookie csrf = csrfCookie(mvc);
        for (int i = 0; i < 3; i++) {
            mvc.perform(loginFrom("203.0.113.30", csrf));
        }

        int status = mvc.perform(withCsrf(post("/api/auth/register"), csrf)
                        .with(request -> {
                            request.setRemoteAddr("203.0.113.30");
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn().getResponse().getStatus();

        assertThat(status).isEqualTo(429);
    }

    @Test
    void passwordChangeIsLimitedTooAgainstGuessingTheCurrentPassword() throws Exception {
        Cookie csrf = csrfCookie(mvc);
        MockHttpServletRequestBuilder change = withCsrf(put("/api/profile/password"), csrf)
                .with(request -> {
                    request.setRemoteAddr("203.0.113.50");
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}");
        for (int i = 0; i < 3; i++) {
            mvc.perform(change);
        }

        mvc.perform(change).andExpect(status().isTooManyRequests());
    }

    @Test
    void otherEndpointsAreNotLimited() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(get("/api/auth/csrf").with(request -> {
                request.setRemoteAddr("203.0.113.40");
                return request;
            })).andExpect(status().isNoContent());
        }
    }
}
