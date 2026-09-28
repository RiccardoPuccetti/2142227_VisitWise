package it.teamlab.visitwise.planning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import it.teamlab.visitwise.planning.engine.GeoPoint;
import it.teamlab.visitwise.planning.engine.Travel;
import it.teamlab.visitwise.planning.engine.TravelModel;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** OSRM table client: blocks, units, points off the map and fail-safe behaviour (US-39). */
class OsrmRoadMatrixProviderTest {

    private static final GeoPoint BASE = new GeoPoint(41.8960, 12.4823);
    private static final GeoPoint CORSO = new GeoPoint(41.9009, 12.4800);
    private static final GeoPoint TIVOLI = new GeoPoint(41.9633, 12.7967);
    private static final String TABLE = "https://osrm.test/table/v1/driving/";
    private static final String ANNOTATIONS = "?annotations=duration,distance";

    private MockRestServiceServer server;
    private RestClient client;

    @BeforeEach
    void bindClient() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://osrm.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = builder.build();
    }

    private OsrmRoadMatrixProvider provider(boolean routing, boolean matrix, int blockSize) {
        return new OsrmRoadMatrixProvider(new RoutingProperties(routing, "https://osrm.test", "VisitWise-test", 1000),
                new RoadMatrixProperties(matrix, blockSize, 2), client);
    }

    @Test
    void convertsMetresAndSecondsOfEachDirectionToKilometresAndMinutes() {
        server.expect(requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900" + ANNOTATIONS))
                .andExpect(header("User-Agent", "VisitWise-test"))
                // osrm-routed answers "deflate" in a form the JDK client cannot read (ZipException): ask for gzip.
                .andExpect(header("Accept-Encoding", "gzip"))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[0,240],[300,0]],"distances":[[0,1500],[1800,0]],
                         "sources":[{"distance":3.2},{"distance":12}],"destinations":[{"distance":3.2},{"distance":12}]}
                        """, MediaType.APPLICATION_JSON));

        Travel roads = provider(true, true, 100).matrix(List.of(BASE, CORSO)).orElseThrow().over(TravelModel.DEFAULT);

        assertThat(roads.roadDistanceKm(BASE, CORSO)).isEqualTo(1.5);
        assertThat(roads.roadDistanceKm(CORSO, BASE)).isEqualTo(1.8);
        assertThat(roads.travelMinutes(BASE, CORSO)).isEqualTo(4);
        assertThat(roads.travelMinutes(CORSO, BASE)).isEqualTo(5);
        server.verify();
    }

    @Test
    void readsTheFullAnswerOfOsrm() {
        // Verbatim answer of osrm-routed v6.0.0 (central Italy extract) for the base and Via del Corso.
        server.expect(requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900" + ANNOTATIONS))
                .andRespond(withSuccess("""
                        {"code":"Ok","distances":[[0,1218],[1368.7,0]],"destinations":[{"hint":"jzMDgP___38YAAAAhwAAAAAAAAAAAAAAl5yAQfE5lEIAAAAAAAAAABgAAACHAAAAAAAAAAAAAAB-BQAAena-ACRIfwL8dr4AQEh_AgAAfxUAAAAA","location":[12.48217,41.895972],"name":"Piazza Venezia","distance":11.23083966},{"hint":"XVACgGWIAoAmAAAABgAAAAwAAABKAAAAJnPNQZTrZkDkeP5ABHREQiYAAAAGAAAADAAAAEoAAAB-BQAAtW--AMhbfwIAbr4AZFt_AgIALwoAAAAA","location":[12.480437,41.901],"name":"Via del Corso","distance":37.91182309}],"durations":[[0,204.1],[191.7,0]],"sources":[{"hint":"jzMDgP___38YAAAAhwAAAAAAAAAAAAAAl5yAQfE5lEIAAAAAAAAAABgAAACHAAAAAAAAAAAAAAB-BQAAena-ACRIfwL8dr4AQEh_AgAAfxUAAAAA","location":[12.48217,41.895972],"name":"Piazza Venezia","distance":11.23083966},{"hint":"XVACgGWIAoAmAAAABgAAAAwAAABKAAAAJnPNQZTrZkDkeP5ABHREQiYAAAAGAAAADAAAAEoAAAB-BQAAtW--AMhbfwIAbr4AZFt_AgIALwoAAAAA","location":[12.480437,41.901],"name":"Via del Corso","distance":37.91182309}]}
                        """, new MediaType("application", "json", java.nio.charset.StandardCharsets.UTF_8)));

        Travel roads = provider(true, true, 100).matrix(List.of(BASE, CORSO)).orElseThrow().over(TravelModel.DEFAULT);

        assertThat(roads.roadDistanceKm(BASE, CORSO)).isEqualTo(1.218);
        assertThat(roads.travelMinutes(CORSO, BASE)).isCloseTo(3.195, org.assertj.core.api.Assertions.within(1e-9));
    }

    @Test
    void splitsLargeTablesIntoBlocksOfSourcesAndDestinations() {
        server.expect(requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900" + ANNOTATIONS))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[0,60],[60,0]],"distances":[[0,1000],[1000,0]],
                         "sources":[{"distance":1},{"distance":1}],"destinations":[{"distance":1},{"distance":1}]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900;12.796700,41.963300" + ANNOTATIONS
                        + "&sources=0;1&destinations=2"))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[2400],[2340]],"distances":[[32000],[32500]],
                         "sources":[{"distance":1},{"distance":1}],"destinations":[{"distance":1}]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo(TABLE + "12.796700,41.963300;12.482300,41.896000;12.480000,41.900900" + ANNOTATIONS
                        + "&sources=0&destinations=1;2"))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[2460,2520]],"distances":[[33000,33500]],
                         "sources":[{"distance":1}],"destinations":[{"distance":1},{"distance":1}]}
                        """, MediaType.APPLICATION_JSON));
        // The last diagonal block holds one point only: OSRM needs two coordinates and the answer is 0 anyway.

        Travel roads = provider(true, true, 2).matrix(List.of(BASE, CORSO, TIVOLI)).orElseThrow()
                .over(TravelModel.DEFAULT);

        assertThat(roads.roadDistanceKm(BASE, CORSO)).isEqualTo(1);
        assertThat(roads.roadDistanceKm(CORSO, TIVOLI)).isEqualTo(32.5);
        assertThat(roads.travelMinutes(TIVOLI, CORSO)).isEqualTo(42);
        assertThat(roads.roadDistanceKm(TIVOLI, TIVOLI)).isZero();
        server.verify();
    }

    @Test
    void estimatesPointsSnappedFarFromTheirPositionAndPairsWithoutARoad() {
        // OSRM snaps a point outside the downloaded map to the nearest road it knows, even thousands of km away.
        server.expect(requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900;12.796700,41.963300" + ANNOTATIONS))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[0,240,null],[300,0,2340],[9000,9100,0]],
                         "distances":[[0,1500,null],[1800,0,32500],[180000,181000,0]],
                         "sources":[{"distance":3},{"distance":12},{"distance":4724549}],
                         "destinations":[{"distance":3},{"distance":12},{"distance":4724549}]}
                        """, MediaType.APPLICATION_JSON));

        Travel roads = provider(true, true, 100).matrix(List.of(BASE, CORSO, TIVOLI)).orElseThrow()
                .over(TravelModel.DEFAULT);

        assertThat(roads.roadDistanceKm(TIVOLI, CORSO)).isEqualTo(TravelModel.DEFAULT.roadDistanceKm(TIVOLI, CORSO));
        assertThat(roads.travelMinutes(CORSO, TIVOLI)).isEqualTo(TravelModel.DEFAULT.travelMinutes(CORSO, TIVOLI));
        assertThat(roads.roadDistanceKm(BASE, CORSO)).isEqualTo(1.5);
    }

    @Test
    void reusesTheTableOfTheSamePoints() {
        server.expect(once(), requestTo(TABLE + "12.482300,41.896000;12.480000,41.900900" + ANNOTATIONS))
                .andRespond(withSuccess("""
                        {"code":"Ok","durations":[[0,240],[300,0]],"distances":[[0,1500],[1800,0]],
                         "sources":[{"distance":1},{"distance":1}],"destinations":[{"distance":1},{"distance":1}]}
                        """, MediaType.APPLICATION_JSON));
        OsrmRoadMatrixProvider provider = provider(true, true, 100);

        var first = provider.matrix(List.of(BASE, CORSO));
        var second = provider.matrix(List.of(BASE, CORSO));

        assertThat(second).containsSame(first.orElseThrow());
        server.verify();
    }

    @Test
    void serverErrorsAndNonOkCodesAreEmptyNotExceptions() {
        server.expect(requestTo(org.hamcrest.Matchers.startsWith(TABLE))).andRespond(withServerError());
        assertThat(provider(true, true, 100).matrix(List.of(BASE, CORSO))).isEmpty();

        server.reset();
        server.expect(requestTo(org.hamcrest.Matchers.startsWith(TABLE)))
                .andRespond(withSuccess("{\"code\":\"TooBig\"}", MediaType.APPLICATION_JSON));
        assertThat(provider(true, true, 100).matrix(List.of(BASE, CORSO))).isEmpty();
        server.verify();
    }

    @Test
    void neverCallsTheNetworkWhenDisabledOrWithFewerThanTwoPoints() {
        assertThat(provider(true, false, 100).matrix(List.of(BASE, CORSO))).isEmpty();
        assertThat(provider(false, true, 100).matrix(List.of(BASE, CORSO))).isEmpty();
        assertThat(provider(true, true, 100).matrix(List.of(BASE))).isEmpty();
        server.verify();
    }
}
