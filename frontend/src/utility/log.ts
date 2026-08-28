//
// Logging for errors that have ALREADY been reported to the user.
//
// Deliberately console.warn rather than console.error. Next's dev overlay
// replaces window.console.error and, in development, inspects the SECOND
// argument — if it is an Error instance it dispatches onUnhandledError and
// throws up a full-screen "Runtime Error" panel:
//
//   next-devtools/userspace/pages/pages-dev-overlay-setup.js
//     const maybeError = process.env.NODE_ENV !== 'production' ? args[1] : args[0]
//     handleError(maybeError)
//
// So `console.error("Upload failed:", err)` on a failure we already caught and
// showed a toast for reads to the developer as an unhandled crash. console.warn
// is not intercepted, so the detail stays in the console without the panel.
//
export const logHandledError = (context: string, error: unknown): void => {
  console.warn(context, error);
};
