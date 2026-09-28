package it.teamlab.visitwise.geocoding;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Geocoding runs in the background on one thread: the public Nominatim allows one request per second anyway. */
@Configuration
@EnableAsync
@EnableConfigurationProperties(GeocodingProperties.class)
public class GeocodingConfig {

    public static final String EXECUTOR = "geocodingExecutor";

    @Bean(name = EXECUTOR)
    Executor geocodingExecutor() {
        return Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "geocoding");
            thread.setDaemon(true);
            return thread;
        });
    }
}
