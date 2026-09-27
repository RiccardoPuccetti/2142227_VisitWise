package it.teamlab.visitwise.imports;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnterpriseRepository extends JpaRepository<Enterprise, Long> {

    List<Enterprise> findByImportBatchIdOrderByPosition(Long importId);
}
