package it.teamlab.visitwise.tenant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.rememberme.CookieTheftException;
import org.springframework.security.web.authentication.rememberme.InvalidCookieException;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;

/**
 * "Keep me logged in" (US-37, AUTHENTICATION.md A13). Spring's persistent-token remember-me: a random series per
 * device and a random token replaced at every automatic login; presenting an already replaced token (a copied cookie)
 * removes every remembered device of the tenant. Two changes to Spring's behavior:
 * <ul>
 * <li>logout forgets only the device that logs out: the account is shared by the whole team;</li>
 * <li>a suspected theft answers like an anonymous request (401) instead of an error.</li>
 * </ul>
 */
public class TenantRememberMeServices extends PersistentTokenBasedRememberMeServices {

    private static final Logger log = LoggerFactory.getLogger(TenantRememberMeServices.class);

    private final RememberMeTokenRepository tokens;

    public TenantRememberMeServices(String key, TenantUserDetailsService userDetailsService,
            RememberMeTokenRepository tokens) {
        super(key, userDetailsService, tokens);
        this.tokens = tokens;
    }

    @Override
    public Authentication autoLogin(HttpServletRequest request, HttpServletResponse response) {
        try {
            return super.autoLogin(request, response);
        } catch (CookieTheftException ex) {
            // Spring has already removed the tenant's tokens and cleared the cookie.
            log.warn("Remember-me token reused, every remembered device logged out: ip={}", request.getRemoteAddr());
            return null;
        }
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        String cookie = extractRememberMeCookie(request);
        if (cookie != null) {
            try {
                String[] seriesAndToken = decodeCookie(cookie);
                if (seriesAndToken.length == 2) {
                    tokens.removeSeries(seriesAndToken[0]);
                }
            } catch (InvalidCookieException ignored) {
                // Nothing stored for a cookie that cannot be read.
            }
        }
        cancelCookie(request, response);
    }

    /** After a password change (A10): no device logs in with the old credentials' tokens. */
    public void forgetTenant(String email) {
        tokens.removeUserTokens(email);
    }
}
