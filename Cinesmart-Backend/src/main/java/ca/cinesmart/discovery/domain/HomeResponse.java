package ca.cinesmart.discovery.domain;

import java.util.List;

/** GET /home: non-empty rows in display order. */
public record HomeResponse(List<HomeSection> sections) {
}
