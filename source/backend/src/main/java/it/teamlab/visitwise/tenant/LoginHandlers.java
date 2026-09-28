package it.teamlab.visitwise.tenant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * JSON answers for Spring Security's form login (AUTHENTICATION.md A5, A8, A11): 200 {@link CurrentTenant} on
 * success; the same 401 for every failure (wrong password, unknown email, locked account); audit log lines that never
 * contain the password.
 */
@Component
public class LoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler, LogoutHandler {

    private static final Logger log = LoggerFactory.getLogger(LoginHandlers.class);

    private final LoginAttemptService loginAttempts;
    private final ProblemDetailsSecurityHandler problems;
    private final JsonMapper jsonMapper;

    public LoginHandlers(LoginAttemptService loginAttempts, ProblemDetailsSecurityHandler problems,
            JsonMapper jsonMapper) {
        this.loginAttempts = loginAttempts;
        this.problems = problems;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        TenantPrincipal principal = (TenantPrincipal) authentication.getPrincipal();
        Tenant tenant = loginAttempts.recordSuccess(principal.tenantId());
        log.info("Login succeeded: tenantId={}, email={}, ip={}", tenant.getId(), tenant.getEmail(), request.getRemoteAddr());
        response.setStatus(HttpStatus.OK.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        jsonMapper.writeValue(response.getOutputStream(), CurrentTenant.from(tenant));
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        String email = Tenant.normalizeEmail(request.getParameter("username"));
        loginAttempts.recordFailure(email);
        log.info("Login failed: email={}, ip={}, reason={}", email, request.getRemoteAddr(),
                exception.getClass().getSimpleName());
        problems.write(request, response, HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof TenantPrincipal principal) {
            log.info("Logout: tenantId={}, email={}, ip={}", principal.tenantId(), principal.getUsername(),
                    request.getRemoteAddr());
        }
    }
}
