package it.teamlab.visitwise.tenant;

import static it.teamlab.visitwise.tenant.AuthTestSupport.login;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** With the Liquibase context "dev" (docker compose default) a demo tenant exists, so teammates can log in at once. */
@SpringBootTest(properties = "spring.liquibase.contexts=dev")
@AutoConfigureMockMvc
class DemoTenantSeedTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void theDemoTenantCanLogIn() throws Exception {
        login(mvc, "demo.federation@visitwise.test", "visitwise-demo")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Demo federation"));
    }
}
