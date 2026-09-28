package it.teamlab.visitwise.common;

import it.teamlab.visitwise.geocoding.AddressNotFoundException;
import it.teamlab.visitwise.geocoding.GeocoderUnavailableException;
import it.teamlab.visitwise.imports.InvalidImportFileException;
import java.util.Comparator;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps exceptions to RFC 9457 problem+json responses. Every error of the API uses this format.
 * Ordered first so its handlers win over Spring Boot's generic problem details handler (which covers the rest).
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail handleBadRequest(IllegalArgumentException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    /** An uploaded file that cannot be imported: the message tells the analyst why (API_CONTRACT.md: 422). */
    @ExceptionHandler(InvalidImportFileException.class)
    ProblemDetail handleInvalidFile(InvalidImportFileException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
    }

    /** The geocoder knows no location for the address (API_CONTRACT.md endpoint 27: 422). */
    @ExceptionHandler(AddressNotFoundException.class)
    ProblemDetail handleAddressNotFound(AddressNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
    }

    /** Nominatim cannot be reached: the analyst can retry later (API_CONTRACT.md endpoint 27: 503). */
    @ExceptionHandler(GeocoderUnavailableException.class)
    ProblemDetail handleGeocoderUnavailable(GeocoderUnavailableException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    /** Bean Validation errors on a request body: the first invalid field (alphabetical) as "field: message". */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleInvalidBody(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .min(Comparator.comparing(FieldError::getField))
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Invalid request body");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }
}
