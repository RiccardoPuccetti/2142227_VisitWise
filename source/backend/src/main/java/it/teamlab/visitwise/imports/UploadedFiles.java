package it.teamlab.visitwise.imports;

import it.teamlab.visitwise.common.Text;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.web.multipart.MultipartFile;

/** Checks shared by the preview and the import (endpoints 2 and 3). */
final class UploadedFiles {

    /** Same limit as {@code import_batch.source_file_name}. */
    static final int MAX_FILE_NAME = 255;

    private UploadedFiles() {
    }

    /** The name without any client path (some browsers send {@code C:\fakepath\...}) or control characters. */
    static String fileName(MultipartFile file) {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("\\p{Cntrl}", "").strip();
        return Text.truncate(name, MAX_FILE_NAME);
    }

    static InputStream content(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new InvalidImportFileException("The file is empty");
        }
        return file.getInputStream();
    }
}
