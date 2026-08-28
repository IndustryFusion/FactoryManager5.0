import axios from "axios";

/**
 * Pulls the most useful message out of a failed request.
 *
 * The backend's exception filter answers with { status, timestamp, path, message },
 * so a real explanation is almost always available — but callers used to discard it
 * and show a fixed string instead. Non-Axios errors (a TypeError while reading the
 * response, an IndexedDB failure) are handled too, since those were previously
 * swallowed without any feedback at all.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data: any = error.response?.data;

    if (typeof data === "string" && data.trim()) return data.trim();

    const candidate = data?.message ?? data?.title ?? data?.detail ?? data?.error;
    if (Array.isArray(candidate)) {
      const joined = candidate.filter(Boolean).join(", ");
      if (joined) return joined;
    } else if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (error.code === "ERR_NETWORK") return "Cannot reach the server.";
    if (error.response?.status) return `Request failed with status ${error.response.status}`;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};
