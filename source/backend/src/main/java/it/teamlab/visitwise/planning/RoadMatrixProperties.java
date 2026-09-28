package it.teamlab.visitwise.planning;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Road distance matrix settings ({@code visitwise.routing.matrix.*}, US-39). Enable it only with a self-hosted OSRM:
 * the public demo server forbids tables of this size. {@code blockSize} is the most sources (and destinations) per
 * request and must not exceed the {@code --max-table-size} of {@code osrm-routed} (100 unless set; 500 in docker
 * compose); {@code cacheSize} is how many tables are kept in memory.
 */
@ConfigurationProperties("visitwise.routing.matrix")
public record RoadMatrixProperties(boolean enabled, int blockSize, int cacheSize) {

    public RoadMatrixProperties {
        if (blockSize <= 0) {
            blockSize = 100;
        }
        if (cacheSize <= 0) {
            cacheSize = 4;
        }
    }
}
