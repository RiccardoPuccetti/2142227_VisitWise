const DEFAULT_URL = '/imports';
const AUTH_PAGES = ['/login', '/register'];

/**
 * Where to go after login (AUTHENTICATION.md step 6). Only internal paths are accepted, so a crafted
 * `?returnUrl=https://evil.example` cannot turn the login page into an open redirect.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_URL;
  }
  const path = value.split(/[?#]/, 1)[0];
  return AUTH_PAGES.includes(path) ? DEFAULT_URL : value;
}
