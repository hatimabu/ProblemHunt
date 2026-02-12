import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://3f7eb3852a69f9d4bd3bd07a79d5a6d6@o4510805016313856.ingest.us.sentry.io/4510805021032448",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
import App from "./app/App";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
