import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App";
import "./app/index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

// Skip noisy local replay setup unless we actually have Sentry configured.
if (sentryDsn) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      sendDefaultPii: true,
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
