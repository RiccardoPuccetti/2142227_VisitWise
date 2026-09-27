package it.teamlab.visitwise.tenant;

import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authentication endpoints (API_CONTRACT.md section 4). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** Endpoint 19: the SPA calls it once at startup to receive the {@code XSRF-TOKEN} cookie. */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        // Reading the (deferred) token makes the repository write the cookie.
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
    }
}
