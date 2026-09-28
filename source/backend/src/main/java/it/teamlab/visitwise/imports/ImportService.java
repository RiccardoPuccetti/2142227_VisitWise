package it.teamlab.visitwise.imports;

import it.teamlab.visitwise.common.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Endpoint 3: reads the file with the analyst's mapping and saves the import for the tenant (US-02, US-04..US-07).
 * Endpoints 4-6: list, detail and delete of the tenant's imports (US-10..US-12).
 */
@Service
public class ImportService {

    /** Points are written and detached in chunks, so a 20,000-row file does not keep every entity in memory. */
    private static final int CHUNK = 500;

    private final ExcelSheetReader reader;
    private final ImportBatchRepository imports;
    private final EnterpriseRepository enterprises;
    private final DeliveryPointRepository points;
    private final EntityManager entityManager;
    private final JsonMapper jsonMapper;
    private final ApplicationEventPublisher events;

    ImportService(ExcelSheetReader reader, ImportBatchRepository imports, EnterpriseRepository enterprises,
            DeliveryPointRepository points, EntityManager entityManager, JsonMapper jsonMapper,
            ApplicationEventPublisher events) {
        this.reader = reader;
        this.imports = imports;
        this.enterprises = enterprises;
        this.points = points;
        this.entityManager = entityManager;
        this.jsonMapper = jsonMapper;
        this.events = events;
    }

    /**
     * All or nothing: an invalid mapping (400) or a file without importable rows (422) saves nothing. Points without
     * coordinates in the file stay PENDING and the import is GEOCODING: the background job (US-08) resolves them after
     * this transaction commits and turns the import READY.
     */
    @Transactional
    public ImportSummary create(Long tenantId, String fileName, InputStream file, CreateImportRequest request) {
        ColumnMapping mapping = request.mapping();
        ParsedSheet sheet = reader.read(file);
        ImportRowParser.checkMapping(sheet.headers(), mapping);
        ParsedRows parsed = ImportRowParser.parse(sheet, mapping);
        if (parsed.rows().isEmpty()) {
            throw new InvalidImportFileException(
                    "No row of the file can be imported: check that the columns are mapped to the right fields");
        }

        int withCoordinates = (int) parsed.rows().stream().filter(row -> row.latitude() != null).count();
        ImportBatch batch = new ImportBatch(tenantId, request.name(), fileName);
        batch.setColumnMapping(jsonMapper.writeValueAsString(mapping));
        batch.setTotalRows(sheet.rows().size());
        batch.setImportedRows(parsed.rows().size());
        batch.setSkippedRows(parsed.skipped());
        batch.setGeocodedRows(withCoordinates);
        boolean needsGeocoding = withCoordinates < parsed.rows().size();
        batch.setStatus(needsGeocoding ? ImportStatus.GEOCODING : ImportStatus.READY);
        imports.save(batch);

        List<Enterprise> saved = new ArrayList<>();
        for (int i = 0; i < mapping.enterprises().size(); i++) {
            EnterpriseMapping enterprise = mapping.enterprises().get(i);
            saved.add(new Enterprise(batch, enterprise.sourceColumn(), enterprise.name(), enterprise.color(), i));
        }
        enterprises.saveAll(saved);

        int written = 0;
        for (ImportRow row : parsed.rows()) {
            entityManager.persist(toPoint(batch, saved, row));
            if (++written % CHUNK == 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        if (needsGeocoding) {
            events.publishEvent(new ImportCreatedEvent(batch.getId()));
        }
        return ImportSummary.of(batch, saved);
    }

    /** Endpoint 4 (US-10): the tenant's imports, newest first. Enterprises of all imports are read in one query. */
    @Transactional(readOnly = true)
    public List<ImportSummary> list(Long tenantId) {
        Map<Long, List<Enterprise>> byImport = enterprises.findByImportBatchTenantIdOrderByPosition(tenantId).stream()
                .collect(Collectors.groupingBy(enterprise -> enterprise.getImportBatch().getId()));
        return imports.findAllByTenantIdOrderByCreatedAtDescIdDesc(tenantId).stream()
                .map(batch -> ImportSummary.of(batch, byImport.getOrDefault(batch.getId(), List.of())))
                .toList();
    }

    /** Endpoint 5 (US-11). Ownership is checked by the tenant guard before the controller is reached. */
    @Transactional(readOnly = true)
    public ImportDetail detail(Long importId) {
        ImportBatch batch = imports.findById(importId).orElseThrow(() -> new NotFoundException("Import", importId));
        ImportSummary summary = ImportSummary.of(batch, enterprises.findByImportBatchIdOrderByPosition(importId));
        ColumnMapping mapping = batch.getColumnMapping() == null
                ? null : jsonMapper.readValue(batch.getColumnMapping(), ColumnMapping.class);
        return ImportDetail.of(summary, mapping, points.findAgents(importId), points.findCities(importId),
                points.countByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.NOT_FOUND),
                batch.getErrorMessage());
    }

    /**
     * Endpoint 6 (US-12): the database cascades the delete to enterprises, points, revenues, plans and their visits
     * (changeset 001). A geocoding job still running for the import skips the points that are gone.
     */
    @Transactional
    public void delete(Long importId) {
        ImportBatch batch = imports.findById(importId).orElseThrow(() -> new NotFoundException("Import", importId));
        imports.delete(batch);
    }

    private static DeliveryPoint toPoint(ImportBatch batch, List<Enterprise> enterprises, ImportRow row) {
        DeliveryPoint point = new DeliveryPoint(batch, row.sourceRow(), row.customer(), row.deliveryPoint(),
                row.address(), row.city(), row.agent());
        if (row.latitude() != null) {
            point.setCoordinates(row.latitude(), row.longitude(), GeocodeStatus.FROM_FILE);
        }
        for (int i = 0; i < enterprises.size(); i++) {
            BigDecimal amount = row.amounts().get(i);
            if (amount.signum() != 0) {
                point.addRevenue(Objects.requireNonNull(enterprises.get(i)), amount);
            }
        }
        return point;
    }
}
