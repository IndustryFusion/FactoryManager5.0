/**
 * Extracts the most useful human-readable message from a failed upstream call.
 *
 * The services in this codebase talk to several backends that all report errors
 * differently, and passing a missing field straight into `new HttpException(...)`
 * used to construct one with an `undefined` response body:
 *
 *   Keycloak  -> { error, error_description }      (no `message`)
 *   Scorpio   -> { title, detail } or EMPTY BODY   (no `message`)
 *   Registry  -> { message, statusCode }
 *   PGREST    -> plain string body
 *
 * Always returns a non-empty string, so callers can hand the result to
 * HttpException without risking an undefined payload.
 */
export function upstreamMessage(err: any, fallback = 'Upstream request failed'): string {
  const response = err?.response;
  const data = response?.data;

  // PGREST and similar return a bare string body.
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    const candidate =
      data.message ??
      data.title ??
      data.detail ??
      data.error_description ??
      data.error ??
      data.errorMessage;

    if (Array.isArray(candidate)) {
      const joined = candidate.filter(Boolean).join(', ');
      if (joined) return joined;
    } else if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    } else if (candidate !== undefined && candidate !== null) {
      return String(candidate);
    }
  }

  // Upstream sent no usable body at all — Scorpio answers 401 with zero bytes.
  // Fall back to the status line rather than losing the failure entirely.
  // The upstream URL is deliberately omitted: this string reaches the browser.
  if (response?.status) {
    const statusText =
      typeof response.statusText === 'string' ? response.statusText.trim() : '';
    return statusText
      ? `${statusText} (upstream status ${response.status})`
      : `Upstream request failed with status ${response.status}`;
  }

  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}
