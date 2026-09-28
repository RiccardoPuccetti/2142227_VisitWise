package it.teamlab.visitwise.imports;

/** The uploaded file cannot be imported (not an .xlsx, empty, too big). The message is shown to the analyst. */
public class InvalidImportFileException extends RuntimeException {

    public InvalidImportFileException(String message) {
        super(message);
    }

    public InvalidImportFileException(String message, Throwable cause) {
        super(message, cause);
    }
}
