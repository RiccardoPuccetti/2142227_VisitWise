package it.teamlab.visitwise.geocoding;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeocodeCacheRepository extends JpaRepository<GeocodeCacheEntry, Long> {

    Optional<GeocodeCacheEntry> findByQueryKey(String queryKey);
}
