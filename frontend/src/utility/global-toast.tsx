//
// A single app-wide toast, mounted once in _app.tsx.
//
// Most components that swallowed errors had no Toast ref of their own, so the
// only way to report a failure was console.error — invisible to the user in
// production. This gives every module (including plain .ts utilities that
// render nothing) a way to report a failure without wiring up its own Toast.
//
import { createRef } from "react";
import { Toast } from "primereact/toast";
import { getErrorMessage } from "./error-message";

export const globalToastRef = createRef<Toast>();

// Several independent loaders can fail from a single underlying cause (backend
// down, session expired). Collapsing identical messages keeps that from turning
// into a stack of duplicate toasts.
const recentlyShown = new Map<string, number>();
const DEDUPE_WINDOW_MS = 4000;

const shouldShow = (key: string): boolean => {
  const now = Date.now();
  for (const [k, at] of recentlyShown) {
    if (now - at > DEDUPE_WINDOW_MS) recentlyShown.delete(k);
  }
  if (recentlyShown.has(key)) return false;
  recentlyShown.set(key, now);
  return true;
};

export const notify = (
  severity: "success" | "info" | "warn" | "error",
  summary: string,
  detail: string,
  life = 6000,
): void => {
  if (!shouldShow(`${severity}|${summary}|${detail}`)) return;
  if (globalToastRef.current) {
    globalToastRef.current.show({ severity, summary, detail, life });
  } else {
    console.warn("Global toast not mounted. Message:", summary, detail);
  }
};

/** Reports a caught error to the user, using the real backend message when there is one. */
export const notifyError = (summary: string, error: unknown, fallback: string): void => {
  notify("error", summary, getErrorMessage(error, fallback));
};

export const GlobalToast = () => <Toast ref={globalToastRef} position="top-right" />;
