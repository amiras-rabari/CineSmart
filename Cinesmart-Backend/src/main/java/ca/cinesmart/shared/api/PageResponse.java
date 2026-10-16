package ca.cinesmart.shared.api;

import java.util.List;
import java.util.function.Function;

/** Standard wrapper for every paginated list (change.md Q17). */
public record PageResponse<T>(
        List<T> results,
        int page,
        int size,
        long totalResults,
        int totalPages
) {
    public static <T> PageResponse<T> of(List<T> results, PageParams params, long totalResults) {
        int totalPages = (int) ((totalResults + params.size() - 1) / params.size());
        return new PageResponse<>(results, params.page(), params.size(), totalResults, totalPages);
    }

    public <R> PageResponse<R> map(Function<List<T>, List<R>> mapper) {
        return new PageResponse<>(mapper.apply(results), page, size, totalResults, totalPages);
    }
}
