package ca.cinesmart.identity.application.exceptions;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;

public class UserAlreadyExistsException extends ApiException {
    public UserAlreadyExistsException(ErrorCode code, String message) {
        super(code, message);
    }
}
