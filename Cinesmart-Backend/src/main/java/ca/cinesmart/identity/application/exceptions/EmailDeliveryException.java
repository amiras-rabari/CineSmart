package ca.cinesmart.identity.application.exceptions;

import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;

public class EmailDeliveryException extends ApiException {
    public EmailDeliveryException(Throwable cause) {
        super(ErrorCode.SERVICE_UNAVAILABLE, "The email could not be sent. Please try again later.", cause);
    }
}
