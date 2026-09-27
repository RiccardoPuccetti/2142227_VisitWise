package it.teamlab.visitwise.tenant;

import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;

/**
 * Security configuration (AUTHENTICATION.md A4-A9): every request needs a session except the public list below;
 * form login at {@code POST /api/auth/login} with JSON answers; logout at {@code POST /api/auth/logout}; CSRF token in
 * the {@code XSRF-TOKEN} cookie, echoed by the SPA in {@code X-XSRF-TOKEN}; errors as problem+json; login and
 * registration rate-limited per IP. Session cookie attributes are in application.yml ({@code server.servlet.session}).
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, ProblemDetailsSecurityHandler problems, LoginHandlers loginHandlers,
            @Value("${visitwise.auth.rate-limit.per-minute:20}") int attemptsPerMinute) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        // No server-rendered login page: the SPA has its own. Only the processing URL is used.
                        .loginPage("/api/auth/login")
                        .loginProcessingUrl("/api/auth/login")
                        .successHandler(loginHandlers)
                        .failureHandler(loginHandlers))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .addLogoutHandler(loginHandlers)
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                        .deleteCookies("JSESSIONID"))
                .csrf(csrf -> csrf.spa())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems))
                .addFilterBefore(new AuthRateLimitFilter(attemptsPerMinute, problems, Clock.systemUTC()),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * The lock is checked after the password, not before (Spring's default): a locked account then costs the same
     * Argon2 verification as any other attempt, so response times do not reveal that the account exists.
     */
    @Bean
    DaoAuthenticationProvider authenticationProvider(TenantUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        provider.setPreAuthenticationChecks(user -> {
        });
        provider.setPostAuthenticationChecks(user -> {
            if (!user.isAccountNonLocked()) {
                throw new LockedException("Account locked");
            }
        });
        return provider;
    }
}
