package ca.cinesmart.shared.api;

import ca.cinesmart.shared.security.ErrorResponseWriter;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Pagination rules (Q17), error codes and the error body shape (Q25). */
class ApiBasicsTest {

    @Test
    void pageParamsDefaultsAndBounds() {
        assertThat(PageParams.of(null, null)).isEqualTo(new PageParams(0, 20));
        assertThat(PageParams.of(2, 30).offset()).isEqualTo(60);
        assertThat(PageParams.of(0, 1).size()).isEqualTo(1);
    }

    @Test
    void pageParamsRejectOutOfRangeValues() {
        assertThatThrownBy(() -> PageParams.of(-1, 10)).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_FAILED));
        assertThatThrownBy(() -> PageParams.of(0, 0)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> PageParams.of(0, 31)).isInstanceOf(ApiException.class);
    }

    @Test
    void pageResponseCountsPages() {
        PageParams params = PageParams.of(0, 5);
        assertThat(PageResponse.of(List.of(), params, 0).totalPages()).isZero();
        assertThat(PageResponse.of(List.of(), params, 5).totalPages()).isEqualTo(1);
        assertThat(PageResponse.of(List.of(), params, 6).totalPages()).isEqualTo(2);
        assertThat(PageResponse.of(List.of(1, 2), params, 2).map(l -> l.stream().map(String::valueOf).toList())
                .results()).containsExactly("1", "2");
    }

    @Test
    void errorCodesMapToTheDocumentedStatuses() {
        assertThat(ErrorCode.ACCOUNT_LOCKED.status().value()).isEqualTo(429);
        assertThat(ErrorCode.ACCOUNT_NOT_VERIFIED.status().value()).isEqualTo(403);
        assertThat(ErrorCode.TOKEN_INVALID.status().value()).isEqualTo(400);
        assertThat(ErrorCode.EMAIL_TAKEN.status().value()).isEqualTo(409);
        assertThat(ErrorCode.forStatus(404)).isEqualTo(ErrorCode.NOT_FOUND);
        assertThat(ErrorCode.forStatus(415)).isEqualTo(ErrorCode.BAD_REQUEST);
        assertThat(ErrorCode.forStatus(502)).isEqualTo(ErrorCode.INTERNAL_ERROR);
    }

    @Test
    void invalidFieldCarriesTheField() {
        ApiException ex = ApiException.invalidField("q", "too short");
        assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_FAILED);
        assertThat(ex.fields()).isEqualTo(Map.of("q", "too short"));
    }

    @Test
    void filterErrorBodyIsValidJsonEvenWithSpecialCharacters() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/x\"y");
        MockHttpServletResponse response = new MockHttpServletResponse();

        ErrorResponseWriter.write(request, response, ErrorCode.RATE_LIMITED, "line1\n\"quoted\" \\ \u0001");

        String body = response.getContentAsString();
        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(429);
        assertThat((String) JsonPath.read(body, "$.code")).isEqualTo("RATE_LIMITED");
        assertThat((String) JsonPath.read(body, "$.message")).isEqualTo("line1\n\"quoted\" \\ \u0001");
        assertThat((String) JsonPath.read(body, "$.path")).isEqualTo("/api/v1/x\"y");
        assertThat((String) JsonPath.read(body, "$.timestamp")).isNotBlank();
    }
}
