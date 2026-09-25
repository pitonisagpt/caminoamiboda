import "./instrument";

import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo salió mal. Por favor recarga la página.</p>}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
