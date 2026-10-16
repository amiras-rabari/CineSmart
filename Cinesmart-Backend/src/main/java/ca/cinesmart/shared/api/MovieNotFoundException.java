package ca.cinesmart.shared.api;

public class MovieNotFoundException extends ApiException {

    public MovieNotFoundException() {
        super(ErrorCode.MOVIE_NOT_FOUND, "Movie was not found");
    }

    public MovieNotFoundException(Long movieId) {
        super(ErrorCode.MOVIE_NOT_FOUND, "Movie was not found with id: " + movieId);
    }
}
