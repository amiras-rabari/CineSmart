package ca.cinesmart.shared.api;

/** Validated page request: page is 0-based, size 1..30 (change.md Q17). */
public record PageParams(int page, int size) {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 30;

    public static PageParams of(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? DEFAULT_SIZE : size;
        if (p < 0) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "page must be 0 or greater");
        }
        if (s < 1 || s > MAX_SIZE) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "size must be between 1 and " + MAX_SIZE);
        }
        return new PageParams(p, s);
    }

    public long offset() {
        return (long) page * size;
    }
}
