package ca.cinesmart.shared.security;

import ca.cinesmart.shared.api.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;

/** Writes the standard error JSON from filters, where the controller advice can't reach. */
public final class ErrorResponseWriter {

    private ErrorResponseWriter() {
    }

    public static void write(HttpServletRequest request, HttpServletResponse response,
                             ErrorCode code, String message) throws IOException {
        response.setStatus(code.status().value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + code.status().value()
                + ",\"code\":\"" + code.name() + "\""
                + ",\"message\":\"" + escape(message) + "\""
                + ",\"path\":\"" + escape(request.getRequestURI()) + "\""
                + ",\"timestamp\":\"" + Instant.now() + "\"}");
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder out = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }
}
