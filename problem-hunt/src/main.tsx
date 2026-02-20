import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { Replay } from "@sentry/replay";

// Initialize Sentry with error handling for CSP violations
try {
  Sentry.init({
    dsn: "https://3f7eb3852a69f9d4bd3bd07a79d5a6d6@o4510805016313856.ingest.us.sentry.io/4510805021032448",
    sendDefaultPii: true,
    // Configure transport to handle CSP and network errors gracefully
    transport: Sentry.makeFetchTransport,
    integrations: [
      new Replay({
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
import App from "./app/App";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
//  <React.StrictMode>
    <App />
//  </React.StrictMode>
);
