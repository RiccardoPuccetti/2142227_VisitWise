package it.teamlab.visitwise.planning.export;

import it.teamlab.visitwise.planning.export.PlanExportService.PlanExport;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Endpoint 18 in API_CONTRACT.md (US-29): the saved plan as an .xlsx file, one sheet per agent. */
@RestController
public class PlanExportController {

    static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final PlanExportService exports;

    PlanExportController(PlanExportService exports) {
        this.exports = exports;
    }

    @GetMapping("/api/plans/{planId}/export")
    ResponseEntity<byte[]> export(@PathVariable Long planId, @RequestParam(required = false) String agent) {
        PlanExport export = exports.export(planId, agent);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(export.fileName()).build().toString())
                .body(export.content());
    }
}
