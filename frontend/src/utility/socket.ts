const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

/**
 * Where to open a socket.io connection to the backend for a given namespace.
 *
 * socket.io-client reads a URL's path as the namespace, not as a prefix, so a
 * backend served under a path (API_URL "/backend" or "https://host/backend")
 * must pass that prefix through `path` instead. API_URL may be relative, so it
 * is resolved against the page's origin. Locally (http://localhost:4002) the
 * prefix is "" and the path stays /socket.io.
 *
 * Browser-only: call it from an effect, not during render.
 */
export function backendSocketTarget(namespace = '/'): { url: string; path: string } {
  const apiUrl = new URL(API_URL!, window.location.origin);
  const prefix = apiUrl.pathname.replace(/\/$/, '');
  return { url: `${apiUrl.origin}${namespace}`, path: `${prefix}/socket.io` };
}
