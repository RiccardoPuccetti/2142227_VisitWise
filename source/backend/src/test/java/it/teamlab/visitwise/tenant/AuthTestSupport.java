package it.teamlab.visitwise.tenant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import jakarta.servlet.http.Cookie;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Request helpers that follow the same flow as the SPA (CSRF cookie echoed in the header, form login). */
final class AuthTestSupport {

    private AuthTestSupport() {
    }

    static Cookie csrfCookie(MockMvc mvc) throws Exception {
        return mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
    }

    static MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request, Cookie csrf) {
        return request.cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
    }

    static ResultActions login(MockMvc mvc, MockHttpSession session, String email, String password) throws Exception {
        return mvc.perform(withCsrf(post("/api/auth/login"), csrfCookie(mvc))
                .session(session)
                .param("username", email)
                .param("password", password));
    }

    static ResultActions login(MockMvc mvc, String email, String password) throws Exception {
        return login(mvc, new MockHttpSession(), email, password);
    }
}
