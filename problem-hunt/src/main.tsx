import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App";
import "./app/index.css";

// Initialize Sentry with error handling for CSP violations
try {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    sendDefaultPii: true,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Sample rate for performance monitoring
    tracesSampleRate: 0.5,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
} catch (sentryError) {
  console.warn('Failed to initialize Sentry:', sentryError);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
