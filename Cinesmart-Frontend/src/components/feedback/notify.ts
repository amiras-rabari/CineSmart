// Toast helpers ([COMP-4]); wraps Sonner. Errors are mapped per [ARCH-3] and deduped by code.
import { toast } from 'sonner';
import { isApiError } from '@/api/errors';
import { errorMessage, logIfClientBug } from './error-message';

export const notify = {
  success(message: string) {
    toast.success(message);
  },
  info(message: string) {
    toast.info(message);
  },
  error(error: unknown) {
    logIfClientBug(error);
    const message = errorMessage(error, 'action');
    // Same code → same toast id, so a burst of failures shows one toast.
    toast.error(message, { id: isApiError(error) ? `error:${error.code}` : `error:${message}` });
  },
};
