const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export const env = {
  /** API base, no trailing slash (contract [CONV-1]). */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, ''),
  isDev: import.meta.env.DEV,
} as const;
