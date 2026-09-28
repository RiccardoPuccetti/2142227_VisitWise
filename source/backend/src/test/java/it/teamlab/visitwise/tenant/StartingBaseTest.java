package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.csrfCookie;
import static it.teamlab.visitwise.tenant.AuthTestSupport.login;
import static it.teamlab.visitwise.tenant.AuthTestSupport.withCsrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.geocoding.FakeGeocoder;
import it.teamlab.visitwise.geocoding.GeocodeCacheRepository;
import it.teamlab.visitwise.geocoding.GeocodingService;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Endpoints 26-27 of API_CONTRACT.md: the tenant starting base (US-35, PUC-10). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StartingBaseTest {

    private static final String EMAIL = "base@visitwise.test";
    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private GeocodeCacheRepository cache;

    private MockHttpSession session;
    private String address;

    @BeforeEach
    void createTenantAndLogIn() throws Exception {
        FakeGeocoder.reset();
        address = "Via della Sede " + UUID.randomUUID();
        tenants.saveAndFlush(new Tenant("Base federation", EMAIL, passwordEncoder.encode(PASSWORD)));
        session = new MockHttpSession();
        login(mvc, session, EMAIL, PASSWORD).andExpect(status().isOk());
    }

    @AfterEach
    void cleanUp() {
        // locate() commits its cache row in its own transaction, so the rollback does not remove it.
        cache.findByQueryKey(GeocodingService.queryKey(address, "Roma")).ifPresent(cache::delete);
        FakeGeocoder.reset();
    }

    private ResultActions save(String body) throws Exception {
        return mvc.perform(withCsrf(put("/api/profile/base"), csrfCookie(mvc))
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    @Test
    void noBaseYetAnswersNoContent() throws Exception {
        mvc.perform(get("/api/profile/base").session(session)).andExpect(status().isNoContent());
    }

    @Test
    void savingGeocodesTheAddressAndReturnsItOnRead() throws Exception {
        FakeGeocoder.knows(address, "Roma", 41.8960, 12.4823);

        save("{\"address\":\"" + address + "\",\"city\":\"Roma\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value(address))
                .andExpect(jsonPath("$.city").value("Roma"))
                .andExpect(jsonPath("$.latitude").value(41.8960))
                .andExpect(jsonPath("$.longitude").value(12.4823));

        mvc.perform(get("/api/profile/base").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(41.8960));
    }

    @Test
    void unknownAddressIsRejectedWith422AndNothingIsSaved() throws Exception {
        save("{\"address\":\"" + address + "\",\"city\":\"Roma\"}")
                .andExpect(status().isUnprocessableContent());

        mvc.perform(get("/api/profile/base").session(session)).andExpect(status().isNoContent());
    }

    @Test
    void blankAddressIsABadRequest() throws Exception {
        save("{\"address\":\"  \",\"city\":\"Roma\"}").andExpect(status().isBadRequest());
    }

    @Test
    void anonymousCallersAreRejected() throws Exception {
        mvc.perform(get("/api/profile/base")).andExpect(status().isUnauthorized());
    }
}
