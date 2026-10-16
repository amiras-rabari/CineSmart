// While an action is in flight its control is aria-disabled + aria-busy ([ARCH-5]), not `disabled`:
// a disabled button drops keyboard focus. The in-flight guard in useMovieAction ignores clicks.
export const PENDING_CLASS = 'aria-busy:pointer-events-none aria-busy:opacity-60';

export function pendingProps(pending: boolean) {
  return pending ? ({ 'aria-busy': true, 'aria-disabled': true } as const) : {};
}
