package ca.cinesmart.discovery.domain;

/**
 * The fixed-order movie lists behind the home rows and their "see more" endpoints (change.md Q21).
 * Declared in home-row order (HomeService relies on it).
 */
public enum RankedList {

    TRENDING("trending", "Trending Now"),
    TOP_RATED("top-rated", "Top Rated by CineSmart Users"),
    MOST_LIKED("most-liked", "Most Liked"),
    IMDB_TOP_250("imdb-top-250", "IMDb Top 250");

    private final String key;
    private final String title;

    RankedList(String key, String title) {
        this.key = key;
        this.title = title;
    }

    /** Home section key; also the last path segment of the list endpoint. */
    public String key() {
        return key;
    }

    public String title() {
        return title;
    }

    public String endpoint() {
        return "/api/v1/movies/" + key;
    }
}
