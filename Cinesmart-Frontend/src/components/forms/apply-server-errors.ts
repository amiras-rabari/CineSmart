// Server errors → form errors ([COMP-5], [ARCH-3]). Field names are the contract JSON names.
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { hasErrorCode } from '@/api/errors';
import { errorMessage, logIfClientBug } from '@/components/feedback/error-message';

const TAKEN_FIELDS = {
  USERNAME_TAKEN: { fields: ['username'], message: 'This username is already taken.' },
  EMAIL_TAKEN: { fields: ['email', 'newEmail'], message: 'This email is already registered.' },
} as const;

/**
 * Puts `fields` messages (and USERNAME_TAKEN / EMAIL_TAKEN) on their inputs.
 * Returns the message for the form-level alert, or `null` when everything was mapped.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): string | null {
  const known = knownFields as readonly string[];

  if (hasErrorCode(error, 'VALIDATION_FAILED') && error.fields) {
    const unmapped: string[] = [];
    for (const [field, message] of Object.entries(error.fields)) {
      if (known.includes(field)) {
        setError(field as Path<T>, { type: 'server', message: sentence(message) });
      } else {
        unmapped.push(`${field} ${message}`);
      }
    }
    return unmapped.length > 0 ? `${error.message}: ${unmapped.join('; ')}.` : null;
  }

  if (hasErrorCode(error, 'USERNAME_TAKEN', 'EMAIL_TAKEN')) {
    const taken = TAKEN_FIELDS[error.code as keyof typeof TAKEN_FIELDS];
    const field = taken.fields.find((name) => known.includes(name));
    if (field) {
      setError(field as Path<T>, { type: 'server', message: taken.message });
      return null;
    }
    return error.message;
  }

  logIfClientBug(error);
  return errorMessage(error, 'form');
}

/** "must not be blank" → "Must not be blank." */
function sentence(message: string): string {
  const text = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
