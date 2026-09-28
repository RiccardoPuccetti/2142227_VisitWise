package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.csrfCookie;
import static it.teamlab.visitwise.tenant.AuthTestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * US-37, AUTHENTICATION.md A13: "Keep me logged in" with persistent remember-me tokens (one per device, rotated on
 * every use, theft detection), forgotten on logout (this device) and on password change (every device).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RememberMeTest {

    private static final String EMAIL = "remember@visitwise.test";
    private static final String PASSWORD = "correct horse battery";
    private static final String COOKIE = "remember-me";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void createTenant() {
        tenants.saveAndFlush(new Tenant("Remember federation", EMAIL, passwordEncoder.encode(PASSWORD)));
    }

    /** Logs in on a new "device" (session) and returns the remember-me cookie, if any. */
    private Cookie login(MockHttpSession session, boolean rememberMe) throws Exception {
        var request = withCsrf(post("/api/auth/login"), csrfCookie(mvc)).session(session)
                .param("username", EMAIL).param("password", PASSWORD);
        if (rememberMe) {
            request.param("remember-me", "true");
        }
        return mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getCookie(COOKIE);
    }

    private Cookie rememberedLogin() throws Exception {
        return login(new MockHttpSession(), true);
    }

    /** A request from a browser that was closed: no session, only the remember-me cookie. */
    private MockHttpServletResponse me(Cookie rememberMe) throws Exception {
        return mvc.perform(get("/api/auth/me").cookie(rememberMe)).andReturn().getResponse();
    }

    private int rememberedDevices() {
        return jdbc.queryForObject("SELECT count(*) FROM persistent_logins WHERE username = ?", Integer.class, EMAIL);
    }

    @Test
    void keepMeLoggedInSetsALongLivedHttpOnlyCookie() throws Exception {
        Cookie cookie = rememberedLogin();

        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getMaxAge()).isEqualTo(14 * 24 * 60 * 60);
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(rememberedDevices()).isEqualTo(1);
    }

    @Test
    void withoutTheCheckboxNothingIsRemembered() throws Exception {
        assertThat(login(new MockHttpSession(), false)).isNull();
        assertThat(rememberedDevices()).isZero();
    }

    @Test
    void theCookieAloneLogsInAgainAndIsReplacedByANewOne() throws Exception {
        Cookie first = rememberedLogin();

        MockHttpServletResponse response = me(first);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getContentAsString()).contains(EMAIL);
        Cookie rotated = response.getCookie(COOKIE);
        assertThat(rotated).isNotNull();
        assertThat(rotated.getValue()).isNotEqualTo(first.getValue());
        assertThat(rememberedDevices()).isEqualTo(1);
        assertThat(me(rotated).getStatus()).isEqualTo(200);
    }

    @Test
    void reusingAReplacedCookieLooksLikeTheftAndForgetsEveryDevice() throws Exception {
        Cookie stolen = rememberedLogin();
        Cookie otherDevice = rememberedLogin();
        me(stolen);

        MockHttpServletResponse response = me(stolen);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(response.getCookie(COOKIE).getMaxAge()).isZero();
        assertThat(rememberedDevices()).isZero();
        assertThat(me(otherDevice).getStatus()).isEqualTo(401);
    }

    @Test
    void logoutForgetsOnlyThisDevice() throws Exception {
        MockHttpSession laptop = new MockHttpSession();
        Cookie laptopCookie = login(laptop, true);
        Cookie desktopCookie = rememberedLogin();

        mvc.perform(withCsrf(post("/api/auth/logout"), csrfCookie(mvc)).session(laptop).cookie(laptopCookie))
                .andExpect(status().isNoContent());

        assertThat(rememberedDevices()).isEqualTo(1);
        assertThat(me(laptopCookie).getStatus()).isEqualTo(401);
        assertThat(me(desktopCookie).getStatus()).isEqualTo(200);
    }

    @Test
    void aPasswordChangeForgetsEveryDevice() throws Exception {
        MockHttpSession laptop = new MockHttpSession();
        login(laptop, true);
        Cookie desktopCookie = rememberedLogin();

        mvc.perform(withCsrf(put("/api/profile/password"), csrfCookie(mvc)).session(laptop)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"" + PASSWORD + "\", \"newPassword\": \"another long password\"}"))
                .andExpect(status().isNoContent());

        assertThat(rememberedDevices()).isZero();
        assertThat(me(desktopCookie).getStatus()).isEqualTo(401);
    }

    @Test
    void aCookieOlderThanFourteenDaysIsRefused() throws Exception {
        Cookie cookie = rememberedLogin();
        jdbc.update("UPDATE persistent_logins SET last_used = now() - interval '15 days' WHERE username = ?", EMAIL);

        assertThat(me(cookie).getStatus()).isEqualTo(401);
    }

    @Test
    void aMalformedCookieIsIgnoredAndCleared() throws Exception {
        MockHttpServletResponse response = me(new Cookie(COOKIE, "not-a-token"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getCookie(COOKIE).getMaxAge()).isZero();
    }
}
