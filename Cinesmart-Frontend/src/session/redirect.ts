// `redirect` query param handling (plan [ARCH-2], [ARCH-6]).

/** Only same-origin paths: must start with `/`, never `//` or `/\` (protocol-relative URLs). */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}

/** `/login`, with `?redirect=` when there is somewhere other than home to come back to. */
export function loginPath(redirect?: string): string {
  return redirect && redirect !== '/'
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';
}
