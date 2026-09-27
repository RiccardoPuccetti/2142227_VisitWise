package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * AUTHENTICATION.md A4 on a real server (MockMvc does not write cookie attributes): the session cookie is HttpOnly and
 * SameSite=Lax, the CSRF cookie is readable by the SPA.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SessionCookieTest {

    private static final String EMAIL = "cookie-test@visitwise.test";
    private static final String PASSWORD = "correct horse battery";

    @LocalServerPort
    private int port;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void createTenant() {
        tenants.saveAndFlush(new Tenant("Cookie test", EMAIL, passwordEncoder.encode(PASSWORD)));
    }

    @AfterEach
    void deleteTenant() {
        tenants.findByEmail(EMAIL).ifPresent(tenants::delete);
    }

    @Test
    void sessionCookieIsHttpOnlyAndSameSiteLaxAndCsrfCookieIsReadable() throws Exception {
        HttpResponse<Void> csrf = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/csrf")).GET().build(),
                HttpResponse.BodyHandlers.discarding());
        String csrfCookie = setCookie(csrf.headers().allValues("Set-Cookie"), "XSRF-TOKEN");
        assertThat(csrfCookie).doesNotContainIgnoringCase("HttpOnly");
        String token = csrfCookie.substring("XSRF-TOKEN=".length(), csrfCookie.indexOf(';'));

        HttpResponse<String> login = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .header("Cookie", "XSRF-TOKEN=" + token)
                        .header("X-XSRF-TOKEN", token)
                        .POST(HttpRequest.BodyPublishers.ofString(
                                "username=cookie-test%40visitwise.test&password=correct+horse+battery"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(login.statusCode()).isEqualTo(200);
        String session = setCookie(login.headers().allValues("Set-Cookie"), "JSESSIONID");
        assertThat(session).containsIgnoringCase("HttpOnly").containsIgnoringCase("SameSite=Lax");
    }

    private static String setCookie(List<String> headers, String name) {
        return headers.stream()
                .filter(h -> h.startsWith(name + "="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No Set-Cookie for " + name + " in " + headers));
    }
}
