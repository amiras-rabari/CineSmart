package ca.cinesmart.support;

/** Tiny JSON object builder for request bodies: Json.of("username", "alice", "rating", 8.5). */
public final class Json {

    private Json() {
    }

    public static String of(Object... keyValues) {
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("Json.of needs key/value pairs");
        }
        StringBuilder out = new StringBuilder("{");
        for (int i = 0; i < keyValues.length; i += 2) {
            if (i > 0) {
                out.append(',');
            }
            out.append(quote(keyValues[i].toString())).append(':').append(value(keyValues[i + 1]));
        }
        return out.append('}').toString();
    }

    private static String value(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        return quote(value.toString());
    }

    private static String quote(String s) {
        StringBuilder out = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                default -> out.append(c);
            }
        }
        return out.append('"').toString();
    }
}
