package ca.cinesmart.identity.application.exceptions;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;

public class InvalidTokenException extends ApiException {
    public InvalidTokenException(String message) {
        super(ErrorCode.TOKEN_INVALID, message);
    }
}
