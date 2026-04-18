import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://3f7eb3852a69f9d4bd3bd07a79d5a6d6@o4510805016313856.ingest.us.sentry.io/4510805021032448",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  // Enable logs to be sent to Sentry
  enableLogs: true,
});