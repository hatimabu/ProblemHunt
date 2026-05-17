import {
  createReactRouterV7DataOptions,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
} from "@grafana/faro-react";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";
import { matchRoutes } from "react-router";

const faroUrl = import.meta.env.VITE_FARO_URL?.trim();

if (!faroUrl) {
  console.warn(
    "VITE_FARO_URL is not set — Grafana Faro is disabled. Add it to problem-hunt/.env (see .env.example).",
  );
} else {
  initializeFaro({
    url: faroUrl,
    app: {
      name: import.meta.env.VITE_FARO_APP_NAME?.trim() || "problemhunt",
      version: "0.0.1",
      environment: import.meta.env.MODE,
    },
    ignoreErrors: [
      /^ResizeObserver loop limit exceeded$/,
      /^ResizeObserver loop completed with undelivered notifications$/,
      /^Script error\.$/,
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
    ignoreUrls: [
      /ingest\.(us\.)?sentry\.io/,
      /\.sentry\.io/,
    ],
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
      new ReactIntegration({
        router: createReactRouterV7DataOptions({
          matchRoutes,
        }),
      }),
    ],
  });
}
