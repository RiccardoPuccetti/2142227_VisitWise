package it.teamlab.visitwise.imports;

import java.io.InputStream;
import org.springframework.stereotype.Service;

/** Endpoint 2: reads the uploaded file and suggests the mapping. Nothing is saved (US-02: the file is not stored). */
@Service
public class ImportPreviewService {

    /** US-03: at most 10 rows in the preview. */
    static final int SAMPLE_ROWS = 10;

    private final ExcelSheetReader reader;
    private final MappingSuggester suggester;

    ImportPreviewService(ExcelSheetReader reader, MappingSuggester suggester) {
        this.reader = reader;
        this.suggester = suggester;
    }

    public ImportPreview preview(String fileName, InputStream file) {
        ParsedSheet sheet = reader.read(file);
        return new ImportPreview(fileName, sheet.sheetName(), sheet.headers(),
                sheet.rows().stream().limit(SAMPLE_ROWS).map(SheetRow::cells).toList(),
                sheet.rows().size(), suggester.suggest(sheet));
    }
}
