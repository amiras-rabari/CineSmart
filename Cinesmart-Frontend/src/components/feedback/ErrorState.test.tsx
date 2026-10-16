import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { renderWithProviders } from '@/test/render';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the network message and calls onRetry', async () => {
    const onRetry = vi.fn();
    const error = new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'x',
      path: '/api/v1/genres',
    });
    renderWithProviders(<ErrorState error={error} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/check your connection/i);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('counts down on RATE_LIMITED and auto-retries at zero', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const error = new ApiError({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'x',
      path: '/api/v1/movies',
      retryAfter: 2,
    });
    renderWithProviders(<ErrorState error={error} onRetry={onRetry} />);
    expect(screen.getByText('Too many requests. Try again in 2 s.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
    act(() => vi.advanceTimersByTime(2100));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });
});
