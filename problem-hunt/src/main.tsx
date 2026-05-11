import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App";
import "./app/index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

/** DevTools + Fast Refresh sometimes throw this during HMR; not an app bug. */
function isReactRefreshDevToolsNoise(event: Sentry.Event): boolean {
  const msg = event.exception?.values?.[0]?.value ?? "";
  if (!msg.includes("Component is not a function")) return false;
  const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
  return frames.some(
    (f) =>
      f.filename?.includes("chrome-extension://") ||
      f.filename?.includes("moz-extension://") ||
      f.filename?.includes("@react-refresh") ||
      f.filename?.includes("/@react-refresh") ||
      f.filename?.includes("installHook.js"),
  );
}

// Skip noisy local replay setup unless we actually have Sentry configured.
if (sentryDsn) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
      sendDefaultPii: true,
      denyUrls: [/chrome-extension:\/\//i, /moz-extension:\/\//i],
      beforeSend(event) {
        if (isReactRefreshDevToolsNoise(event)) return null;
        return event;
      },
      integrations: import.meta.env.DEV
        ? []
        : [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ],
      tracesSampleRate: 0.5,
      replaysSessionSampleRate: import.meta.env.DEV ? 0 : 0.1,
      replaysOnErrorSampleRate: import.meta.env.DEV ? 0 : 1.0,
    });
  } catch (sentryError) {
    console.warn("Failed to initialize Sentry:", sentryError);
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
