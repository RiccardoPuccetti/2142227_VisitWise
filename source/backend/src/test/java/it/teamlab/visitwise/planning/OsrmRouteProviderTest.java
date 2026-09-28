package it.teamlab.visitwise.planning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import java.util.List;
import java.util.Optional;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** OSRM client parsing and fail-safe behaviour (OPTIMIZATION_STRATEGY.md section 9). */
class OsrmRouteProviderTest {

    private static final List<GeoPoint> STOPS = List.of(
            new GeoPoint(41.8960, 12.4823), new GeoPoint(41.9009, 12.4800), new GeoPoint(41.8960, 12.4823));

    private MockRestServiceServer server;
    private OsrmRouteProvider provider;

    @BeforeEach
    void bindClient() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://osrm.test");
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new OsrmRouteProvider(new RoutingProperties(true, "https://osrm.test", "VisitWise-test", 1000),
                builder.build());
    }

    @Test
    void parsesDistanceDurationLegsAndGeoJsonGeometry() {
        server.expect(requestTo(Matchers.startsWith(
                        "https://osrm.test/route/v1/driving/12.482300,41.896000;12.480000,41.900900;12.482300,41.896000")))
                .andExpect(header("User-Agent", "VisitWise-test"))
                .andRespond(withSuccess("""
                        {"code":"Ok","routes":[{"distance":1500.0,"duration":240.0,
                          "legs":[{"distance":800.0,"duration":130.0},{"distance":700.0,"duration":110.0}],
                          "geometry":{"type":"LineString","coordinates":[[12.4823,41.896],[12.48,41.9009],[12.4823,41.896]]}}]}
                        """, MediaType.APPLICATION_JSON));

        Optional<RoutedPath> path = provider.route(STOPS);

        assertThat(path).isPresent();
        assertThat(path.get().km()).isEqualTo(1.5);
        assertThat(path.get().minutes()).isEqualTo(4.0);
        assertThat(path.get().legs()).extracting(RoutedPath.Leg::km).containsExactly(0.8, 0.7);
        assertThat(path.get().geometry()).containsExactly(
                new GeoPoint(41.896, 12.4823), new GeoPoint(41.9009, 12.48), new GeoPoint(41.896, 12.4823));
        server.verify();
    }

    @Test
    void serverErrorsAndNonOkCodesAreEmptyNotExceptions() {
        server.expect(requestTo(Matchers.startsWith("https://osrm.test/route"))).andRespond(withServerError());
        assertThat(provider.route(STOPS)).isEmpty();

        server.reset();
        server.expect(requestTo(Matchers.startsWith("https://osrm.test/route")))
                .andRespond(withSuccess("{\"code\":\"NoRoute\",\"routes\":[]}", MediaType.APPLICATION_JSON));
        assertThat(provider.route(STOPS)).isEmpty();
    }

    @Test
    void disabledProviderNeverCallsTheNetwork() {
        OsrmRouteProvider disabled = new OsrmRouteProvider(
                new RoutingProperties(false, "https://osrm.test", "x", 1000), RestClient.create());
        assertThat(disabled.route(STOPS)).isEmpty();
        assertThat(provider.route(List.of(STOPS.get(0)))).isEmpty();
    }
}
