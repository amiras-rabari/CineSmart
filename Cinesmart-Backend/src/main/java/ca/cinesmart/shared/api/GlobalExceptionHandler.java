package ca.cinesmart.shared.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The only controller advice. Spring's own 4xx errors keep their status (B-3);
 * anything unexpected becomes a 500 without internal details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
        return respond(ex.code(), ex.getMessage(), request.getRequestURI(), ex.fields());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> {
            String path = v.getPropertyPath().toString();
            fields.put(path.substring(path.lastIndexOf('.') + 1), v.getMessage());
        });
        return respond(ErrorCode.VALIDATION_FAILED, "Invalid request parameters", request.getRequestURI(), fields);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return respond(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred", request.getRequestURI(), null);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ApiError body = ApiError.of(ErrorCode.VALIDATION_FAILED, "Invalid request fields", path(request), fields);
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException ex,
                                                                            HttpHeaders headers, HttpStatusCode status,
                                                                            WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getParameterValidationResults().forEach(result -> result.getResolvableErrors().stream().findFirst()
                .ifPresent(error -> fields.put(result.getMethodParameter().getParameterName(), error.getDefaultMessage())));
        ApiError body = ApiError.of(ErrorCode.VALIDATION_FAILED, "Invalid request parameters", path(request), fields);
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    /** Every other Spring MVC exception (404, 405, type mismatch, missing param, bad JSON, ...). */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        ErrorCode code = ErrorCode.forStatus(statusCode.value());
        ApiError error = new ApiError(statusCode.value(), code.name(), messageFor(ex, statusCode),
                path(request), java.time.Instant.now().toString(), null);
        return ResponseEntity.status(statusCode).headers(headers).body(error);
    }

    private String messageFor(Exception ex, HttpStatusCode status) {
        if (ex instanceof NoResourceFoundException) {
            return "Resource not found";
        }
        if (ex instanceof HttpMessageNotReadableException) {
            return "Request body is missing or malformed";
        }
        if (ex instanceof ErrorResponse errorResponse && errorResponse.getBody().getDetail() != null) {
            return errorResponse.getBody().getDetail();
        }
        return status.is5xxServerError() ? "An unexpected error occurred" : "Bad request";
    }

    private ResponseEntity<ApiError> respond(ErrorCode code, String message, String path, Map<String, String> fields) {
        return ResponseEntity.status(code.status()).body(ApiError.of(code, message, path, fields));
    }

    private String path(WebRequest request) {
        return request instanceof ServletWebRequest servlet ? servlet.getRequest().getRequestURI() : null;
    }
}
