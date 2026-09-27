package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Step 8 of AUTHENTICATION.md (US-33, D-09): a tenant never reaches another tenant's imports or plans. The real
 * import and plan endpoints are written later by their owners, so a probe controller stands in for them: the guard
 * protects every URL under /api/imports/{id} and /api/plans/{id}, whoever writes the controller.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TenantIsolationTest {

    @TestConfiguration
    static class ProbeEndpoints {

        @Bean
        ProbeController isolationProbe() {
            return new ProbeController();
        }
    }

    @RestController
    static class ProbeController {

        @GetMapping("/api/imports/{importId}/isolation-probe")
        String importProbe(@PathVariable Long importId) {
            return "reached import " + importId;
        }

        @GetMapping("/api/plans/{planId}/isolation-probe")
        String planProbe(@PathVariable Long planId) {
            return "reached plan " + planId;
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private ImportBatchRepository imports;

    @Autowired
    private EntityManager entityManager;

    private Tenant owner;
    private Tenant other;
    private ImportBatch ownersImport;
    private Long ownersPlanId;

    @BeforeEach
    void createTwoTenantsAndTheOwnersData() {
        owner = tenants.saveAndFlush(new Tenant("Owner federation", "owner@visitwise.test", "{argon2}hash"));
        other = tenants.saveAndFlush(new Tenant("Other federation", "other@visitwise.test", "{argon2}hash"));
        ownersImport = imports.saveAndFlush(new ImportBatch(owner.getId(), "Owner 2026", "owner.xlsx"));
        ownersPlanId = ((Number) entityManager
                .createNativeQuery("INSERT INTO visit_plan (import_id, name, parameters) VALUES (:importId, 'Xmas', '{}') RETURNING id")
                .setParameter("importId", ownersImport.getId())
                .getSingleResult()).longValue();
    }

    private String importUrl(String suffix) {
        return "/api/imports/" + ownersImport.getId() + suffix;
    }

    private String planUrl(String suffix) {
        return "/api/plans/" + ownersPlanId + suffix;
    }

    @Test
    void theOwnerReachesItsImportAndPlan() throws Exception {
        mvc.perform(get(importUrl("/isolation-probe")).with(asTenant(owner.getId())))
                .andExpect(status().isOk())
                .andExpect(content().string("reached import " + ownersImport.getId()));
        mvc.perform(get(planUrl("/isolation-probe")).with(asTenant(owner.getId())))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/isolation-probe", "/points", "/analytics/summary", "/plans", "/geocoding/retry"})
    void anotherTenantGets404OnEveryUrlOfTheImport(String suffix) throws Exception {
        mvc.perform(get(importUrl(suffix)).with(asTenant(other.getId())))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Import " + ownersImport.getId() + " not found"));
    }

    @Test
    void anotherTenantCannotChangeOrDeleteTheImport() throws Exception {
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                delete(importUrl("")), post(importUrl("/plans/simulate")), post(importUrl("/geocoding/retry"))}) {
            mvc.perform(request.with(asTenant(other.getId())).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isNotFound());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/isolation-probe", "/export"})
    void anotherTenantGets404OnEveryUrlOfThePlan(String suffix) throws Exception {
        mvc.perform(get(planUrl(suffix)).with(asTenant(other.getId())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Plan " + ownersPlanId + " not found"));
        mvc.perform(delete(planUrl(suffix)).with(asTenant(other.getId())).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherTenantsImportLooksExactlyLikeOneThatDoesNotExist() throws Exception {
        long missing = ownersImport.getId() + 1_000_000;
        String foreign = mvc.perform(get(importUrl("")).with(asTenant(other.getId())))
                .andReturn().getResponse().getContentAsString();
        String absent = mvc.perform(get("/api/imports/" + missing).with(asTenant(other.getId())))
                .andReturn().getResponse().getContentAsString();

        assertThat(foreign.replace(ownersImport.getId().toString(), "ID"))
                .isEqualTo(absent.replace(Long.toString(missing), "ID"));
    }

    @Test
    void urlsWithoutAnIdAreNotTouchedByTheGuard() throws Exception {
        String body = mvc.perform(get("/api/imports/template").with(asTenant(other.getId())))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("Import template not found");
    }

    @Test
    void theImportsListContainsOnlyTheTenantsOwnImportsNewestFirst() {
        ImportBatch newer = imports.saveAndFlush(new ImportBatch(owner.getId(), "Owner 2027", "owner-2027.xlsx"));
        imports.saveAndFlush(new ImportBatch(other.getId(), "Other 2026", "other.xlsx"));

        assertThat(imports.findAllByTenantIdOrderByCreatedAtDesc(owner.getId()))
                .extracting(ImportBatch::getName)
                .containsExactly(newer.getName(), ownersImport.getName());
    }

    @Test
    void deletingATenantDeletesItsImportsAndPlans() {
        tenants.delete(owner);
        tenants.flush();
        entityManager.clear();

        assertThat(imports.findById(ownersImport.getId())).isEmpty();
        Number plans = (Number) entityManager.createNativeQuery("SELECT count(*) FROM visit_plan WHERE id = :id")
                .setParameter("id", ownersPlanId)
                .getSingleResult();
        assertThat(plans.longValue()).isZero();
    }
}
