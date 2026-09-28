package it.teamlab.visitwise.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Tenant isolation (US-33, D-09, AUTHENTICATION.md A12). Every URL under {@code /api/imports/{id}} and
 * {@code /api/plans/{id}} is checked here, before any controller: if the import or plan does not belong to the
 * logged-in tenant the answer is the same 404 as for an id that does not exist. Controllers written by any team member
 * are covered without doing anything. Runs after authorization, so the request is already authenticated.
 */
public class TenantGuardFilter extends OncePerRequestFilter {

    private static final Pattern IMPORT_URL = Pattern.compile("^/api/imports/(\\d+)(?:/.*)?$");
    private static final Pattern PLAN_URL = Pattern.compile("^/api/plans/(\\d+)(?:/.*)?$");

    private final TenantOwnership ownership;
    private final ProblemDetailsSecurityHandler problems;

    public TenantGuardFilter(TenantOwnership ownership, ProblemDetailsSecurityHandler problems) {
        this.ownership = ownership;
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        Matcher importUrl = IMPORT_URL.matcher(path);
        Matcher planUrl = PLAN_URL.matcher(path);
        if (importUrl.matches() || planUrl.matches()) {
            Long tenantId = currentTenantId();
            if (importUrl.matches()) {
                Long importId = parseId(importUrl.group(1));
                if (tenantId == null || importId == null || !ownership.ownsImport(tenantId, importId)) {
                    problems.write(request, response, HttpStatus.NOT_FOUND, "Import " + importUrl.group(1) + " not found");
                    return;
                }
            } else {
                Long planId = parseId(planUrl.group(1));
                if (tenantId == null || planId == null || !ownership.ownsPlan(tenantId, planId)) {
                    problems.write(request, response, HttpStatus.NOT_FOUND, "Plan " + planUrl.group(1) + " not found");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }

    private static Long currentTenantId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof TenantPrincipal principal
                ? principal.tenantId()
                : null;
    }

    /** Ids too long for a long cannot exist. */
    private static Long parseId(String digits) {
        try {
            return Long.valueOf(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
